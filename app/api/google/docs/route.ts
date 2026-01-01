import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

function getOAuth2Client(accessToken: string, refreshToken?: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/google/callback`
  );
  
  const credentials: any = {
    access_token: accessToken
  };
  
  if (refreshToken) {
    credentials.refresh_token = refreshToken;
  }
  
  oauth2Client.setCredentials(credentials);
  
  return oauth2Client;
}

// Parse Google Docs content into structured data
function parseGoogleDocContent(doc: any): any[] {
  const rows: any[] = [];
  
  if (!doc.body || !doc.body.content) {
    return rows;
  }
  
  // Look for tables first (most structured)
  const tables = extractTables(doc.body.content);
  if (tables.length > 0) {
    // Use table data
    tables.forEach(table => {
      const tableRows = parseTable(table);
      rows.push(...tableRows);
    });
  } else {
    // Parse text content for structured patterns
    const textRows = parseTextContent(doc.body.content);
    rows.push(...textRows);
  }
  
  return rows;
}

function extractTables(content: any[]): any[] {
  const tables: any[] = [];
  
  function traverse(node: any) {
    if (node.table) {
      tables.push(node.table);
    }
    if (node.paragraph) {
      // Check if paragraph contains table-like structure
      const elements = node.paragraph.elements || [];
      // Could check for tab-separated or other patterns here
    }
    if (node.sectionBreak || node.tableOfContents) {
      // Skip these
      return;
    }
    // Recursively check nested content
    if (node.elements) {
      node.elements.forEach(traverse);
    }
    if (node.content) {
      node.content.forEach(traverse);
    }
  }
  
  content.forEach(traverse);
  return tables;
}

function parseTable(table: any): any[] {
  const rows: any[] = [];
  
  if (!table.tableRows) {
    return rows;
  }
  
  // First row might be headers
  const tableRows = table.tableRows;
  let headers: string[] = [];
  
  if (tableRows.length > 0) {
    const firstRow = tableRows[0];
    if (firstRow.tableCells) {
      headers = firstRow.tableCells.map((cell: any) => {
        return extractTextFromCell(cell);
      });
    }
  }
  
  // Parse data rows
  for (let i = 1; i < tableRows.length; i++) {
    const row = tableRows[i];
    if (!row.tableCells) continue;
    
    const rowData: any = {};
    row.tableCells.forEach((cell: any, index: number) => {
      const cellText = extractTextFromCell(cell);
      const header = headers[index] || `column_${index}`;
      rowData[header] = cellText;
    });
    
    if (Object.keys(rowData).length > 0) {
      rows.push(rowData);
    }
  }
  
  return rows;
}

function extractTextFromCell(cell: any): string {
  if (!cell.content) return '';
  
  let text = '';
  
  function extractText(node: any) {
    if (node.paragraph) {
      if (node.paragraph.elements) {
        node.paragraph.elements.forEach((elem: any) => {
          if (elem.textRun) {
            text += elem.textRun.content || '';
          }
        });
      }
    }
    if (node.content) {
      node.content.forEach(extractText);
    }
  }
  
  cell.content.forEach(extractText);
  return text.trim();
}

function parseTextContent(content: any[]): any[] {
  const rows: any[] = [];
  let currentRow: any = {};
  let currentQuestion = '';
  let currentAnswer = '';
  
  function extractText(node: any): string {
    let text = '';
    
    if (node.paragraph) {
      if (node.paragraph.elements) {
        node.paragraph.elements.forEach((elem: any) => {
          if (elem.textRun) {
            text += elem.textRun.content || '';
          }
        });
      }
    }
    
    if (node.content) {
      node.content.forEach((child: any) => {
        text += extractText(child);
      });
    }
    
    return text;
  }
  
  content.forEach(node => {
    const text = extractText(node).trim();
    if (!text) return;
    
    // Look for Q&A patterns
    if (/^Q\d*[:\-\.]?\s*/i.test(text)) {
      // New question
      if (currentQuestion && currentAnswer) {
        rows.push({
          question: currentQuestion,
          answer: currentAnswer
        });
      }
      currentQuestion = text.replace(/^Q\d*[:\-\.]?\s*/i, '');
      currentAnswer = '';
    } else if (/^A\d*[:\-\.]?\s*/i.test(text)) {
      // Answer
      currentAnswer = text.replace(/^A\d*[:\-\.]?\s*/i, '');
    } else if (currentQuestion && !currentAnswer) {
      // Continuation of question
      currentQuestion += ' ' + text;
    } else if (currentAnswer) {
      // Continuation of answer
      currentAnswer += ' ' + text;
    } else {
      // New question without Q prefix
      if (currentQuestion && currentAnswer) {
        rows.push({
          question: currentQuestion,
          answer: currentAnswer
        });
      }
      currentQuestion = text;
      currentAnswer = '';
    }
  });
  
  // Add last question
  if (currentQuestion && currentAnswer) {
    rows.push({
      question: currentQuestion,
      answer: currentAnswer
    });
  }
  
  return rows;
}

export async function GET() {
  return NextResponse.json(
    { 
      error: 'This endpoint only accepts POST requests',
      message: 'Please use the Google Docs import page at /import/google to fetch documents'
    },
    { status: 405 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const { documentId, accessToken, refreshToken } = await request.json();
    
    if (!documentId || !accessToken) {
      return NextResponse.json(
        { error: 'Document ID and access token are required' },
        { status: 400 }
      );
    }
    
    // Validate environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('Missing Google OAuth credentials');
      return NextResponse.json(
        { error: 'Server configuration error: Google OAuth credentials not configured' },
        { status: 500 }
      );
    }
    
    const oauth2Client = getOAuth2Client(accessToken, refreshToken);
    
    // Try to refresh token if it's expired
    try {
      await oauth2Client.getAccessToken();
    } catch (refreshError: any) {
      console.error('Token refresh error:', refreshError);
      // Continue anyway - the API call might still work
    }
    
    const docs = google.docs({ version: 'v1', auth: oauth2Client });
    
    const response = await docs.documents.get({
      documentId: documentId
    });
    
    const parsedData = parseGoogleDocContent(response.data);
    
    // Get updated tokens if they were refreshed
    const credentials = oauth2Client.credentials;
    const responseData: any = {
      success: true,
      data: parsedData,
      documentTitle: response.data.title || 'Untitled Document'
    };
    
    // Return new access token if it was refreshed
    if (credentials.access_token && credentials.access_token !== accessToken) {
      responseData.newAccessToken = credentials.access_token;
    }
    
    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Error fetching Google Doc:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      response: error.response?.data
    });
    
    // Provide more specific error messages
    if (error.code === 401 || error.message?.includes('Invalid Credentials') || error.message?.includes('invalid_grant')) {
      return NextResponse.json(
        { 
          error: 'Authentication failed. Please re-authenticate with Google.', 
          details: error.message,
          code: error.code,
          requiresReauth: true
        },
        { status: 401 }
      );
    }
    
    if (error.code === 403 || error.message?.includes('Permission denied') || error.message?.includes('insufficient permissions')) {
      return NextResponse.json(
        { 
          error: 'Permission denied. Make sure the document is shared with your Google account and you have granted access to Google Docs.', 
          details: error.message,
          code: error.code
        },
        { status: 403 }
      );
    }
    
    if (error.code === 404 || error.message?.includes('not found')) {
      return NextResponse.json(
        { 
          error: 'Document not found. Check the document ID and ensure the document exists.', 
          details: error.message,
          code: error.code
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch Google Doc', 
        details: error.message || 'Unknown error',
        code: error.code
      },
      { status: 500 }
    );
  }
}

