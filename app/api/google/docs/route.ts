import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

function getOAuth2Client(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/google/callback`
  );
  
  oauth2Client.setCredentials({
    access_token: accessToken
  });
  
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

export async function POST(request: NextRequest) {
  try {
    const { documentId, accessToken } = await request.json();
    
    if (!documentId || !accessToken) {
      return NextResponse.json(
        { error: 'Document ID and access token are required' },
        { status: 400 }
      );
    }
    
    const oauth2Client = getOAuth2Client(accessToken);
    const docs = google.docs({ version: 'v1', auth: oauth2Client });
    
    const response = await docs.documents.get({
      documentId: documentId
    });
    
    const parsedData = parseGoogleDocContent(response.data);
    
    return NextResponse.json({
      success: true,
      data: parsedData,
      documentTitle: response.data.title || 'Untitled Document'
    });
  } catch (error: any) {
    console.error('Error fetching Google Doc:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Google Doc', details: error.message },
      { status: 500 }
    );
  }
}

