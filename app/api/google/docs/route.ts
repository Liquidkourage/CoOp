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
    console.log('No body or content found in document');
    return rows;
  }
  
  console.log('Document structure:', JSON.stringify(doc.body.content.slice(0, 3), null, 2));
  
  // Look for tables first (most structured)
  const tables = extractTables(doc.body.content);
  console.log(`Found ${tables.length} tables`);
  
  if (tables.length > 0) {
    // Use table data
    tables.forEach((table, idx) => {
      const tableRows = parseTable(table);
      console.log(`Table ${idx + 1} has ${tableRows.length} rows`);
      rows.push(...tableRows);
    });
  }
  
  // Also try parsing text content (might have structured text)
  if (rows.length === 0) {
    console.log('No tables found, trying text parsing');
    const textRows = parseTextContent(doc.body.content);
    console.log(`Text parsing found ${textRows.length} rows`);
    rows.push(...textRows);
  }
  
  // If still no rows, try parsing paragraphs as potential questions
  if (rows.length === 0) {
    console.log('Trying paragraph-based parsing');
    const paragraphRows = parseParagraphs(doc.body.content);
    console.log(`Paragraph parsing found ${paragraphRows.length} rows`);
    rows.push(...paragraphRows);
  }
  
  // If still no rows, try numbered question format (Q: question text, A: answer)
  if (rows.length === 0) {
    console.log('Trying numbered question format parsing');
    const numberedRows = parseNumberedQuestions(doc.body.content);
    console.log(`Numbered question parsing found ${numberedRows.length} rows`);
    rows.push(...numberedRows);
  }
  
  // Final safety check: Remove any rows where the question looks like a round name
  // (short, no question mark, doesn't start with question words)
  const filteredRows = rows.filter(row => {
    if (!row.question) return true;
    
    const questionText = row.question.trim();
    
    // Skip rows where question is suspiciously round-name-like
    // (short, no question mark, no question words, not numbered)
    const isShort = questionText.length < 100;
    const hasNoQuestionMark = !questionText.includes('?');
    const isNotNumbered = !/^\d+\./.test(questionText);
    const hasNoQuestionWords = !/\b(what|who|when|where|why|how|which|whose|whom)\b/i.test(questionText);
    
    if (isShort && hasNoQuestionMark && isNotNumbered && hasNoQuestionWords) {
      console.log('⚠️ Filtering out row that looks like round name:', questionText);
      return false;
    }
    
    return true;
  });
  
  console.log(`📊 Final result: ${filteredRows.length} rows (${rows.length} before final filter)`);
  
  return filteredRows;
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

// Parse paragraphs - treat each paragraph as a potential question/answer pair
function parseParagraphs(content: any[]): any[] {
  const rows: any[] = [];
  const paragraphs: string[] = [];
  
  function extractParagraphText(node: any): string {
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
        text += extractParagraphText(child);
      });
    }
    
    return text;
  }
  
  content.forEach(node => {
    const text = extractParagraphText(node).trim();
    if (text) {
      paragraphs.push(text);
    }
  });
  
  // Try to pair paragraphs as Q&A
  for (let i = 0; i < paragraphs.length; i += 2) {
    const question = paragraphs[i];
    const answer = paragraphs[i + 1] || '';
    
    if (question) {
      rows.push({
        question: question,
        answer: answer
      });
    }
  }
  
  // If we have an odd number, add the last one as a question
  if (paragraphs.length % 2 === 1 && paragraphs.length > 0) {
    rows.push({
      question: paragraphs[paragraphs.length - 1],
      answer: ''
    });
  }
  
  return rows;
}

// Parse numbered questions format: "Question text? Answer" (answer on same or next line)
function parseNumberedQuestions(content: any[]): any[] {
  const rows: any[] = [];
  let roundName = '';
  const allText: string[] = [];
  
  // Extract text from each paragraph separately (preserve paragraph boundaries)
  function extractParagraphText(node: any): string {
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
    
    return text;
  }
  
  // Process content to extract each paragraph as a separate line
  function processContent(nodes: any[]) {
    nodes.forEach(node => {
      if (node.paragraph) {
        const text = extractParagraphText(node).trim();
        if (text) {
          allText.push(text);
        }
      }
      
      // Recursively process nested content
      if (node.content) {
        processContent(node.content);
      }
      
      // Also check for nested elements
      if (node.elements) {
        node.elements.forEach((elem: any) => {
          if (elem.paragraph) {
            const text = extractParagraphText(elem).trim();
            if (text) {
              allText.push(text);
            }
          }
        });
      }
    });
  }
  
  processContent(content);
  
  console.log('All extracted text lines:', allText);
  console.log('Total lines:', allText.length);
  
  if (allText.length === 0) {
    return rows;
  }
  
  // First line might be the round name (if it's short and doesn't look like a question)
  // Be VERY aggressive - if first line is short (< 100 chars) and has no "?", treat as round name
  const firstLine = allText[0].trim();
  console.log('🔍 First line analysis:', {
    text: firstLine,
    length: firstLine.length,
    hasQuestionMark: firstLine.includes('?'),
    isNumbered: /^\d+\./.test(firstLine),
    hasQuestionWords: /\b(what|who|when|where|why|how|which|whose|whom)\b/i.test(firstLine),
    endsWithQuestionMark: firstLine.endsWith('?')
  });
  
  // Check if first line looks like a round name
  // Criteria: short, no question mark, not numbered, doesn't start with question words
  const isShort = firstLine.length < 100;
  const hasNoQuestionMark = !firstLine.includes('?');
  const isNotNumbered = !/^\d+\./.test(firstLine);
  const hasNoQuestionWords = !/\b(what|who|when|where|why|how|which|whose|whom)\b/i.test(firstLine);
  const looksLikeRoundName = isShort && hasNoQuestionMark && isNotNumbered && hasNoQuestionWords;
  
  console.log('🔍 Round name detection:', {
    isShort,
    hasNoQuestionMark,
    isNotNumbered,
    hasNoQuestionWords,
    looksLikeRoundName
  });
  
  if (looksLikeRoundName) {
    roundName = firstLine;
    console.log('✅ Extracted round name:', roundName);
    allText.shift(); // Remove round name from processing
    console.log('✅ Remaining lines after removing round name:', allText.length);
    if (allText.length > 0) {
      console.log('✅ First remaining line:', allText[0].substring(0, 80));
    }
  } else {
    console.log('❌ First line does NOT look like round name - will process as regular line');
    console.log('❌ Reason:', {
      isShort: isShort ? '✓' : '✗ (too long)',
      hasNoQuestionMark: hasNoQuestionMark ? '✓' : '✗ (has ?)',
      isNotNumbered: isNotNumbered ? '✓' : '✗ (numbered)',
      hasNoQuestionWords: hasNoQuestionWords ? '✓' : '✗ (has question words)'
    });
  }
  
  // Process remaining lines - look for question-answer pairs
  // Pattern: Question (has ?) followed by Answer (no ?, usually short)
  let currentQuestion = '';
  
  for (let i = 0; i < allText.length; i++) {
    const line = allText[i].trim();
    if (!line) continue;
    
    console.log(`Processing line ${i}:`, line.substring(0, 80), 'Has ?:', line.includes('?'), 'Length:', line.length);
    
    // Check if line contains a question mark (likely a question)
    if (line.includes('?')) {
      // If we have a previous question without an answer, save it with empty answer
      if (currentQuestion) {
        console.log('⚠️ Previous question had no answer, saving with empty answer');
        rows.push({
          question: currentQuestion.trim(),
          answer: '',
          round: roundName || undefined
        });
        currentQuestion = ''; // Clear it
      }
      
      // Try to split question and answer on the same line
      // Pattern: "Question text? Answer" or "1. Question text? Answer"
      const questionMatch = line.match(/^(\d+\.\s*)?(.+?\?)\s*(.+)$/);
      if (questionMatch && questionMatch[3].trim().length > 0) {
        // Question and answer on same line
        const question = questionMatch[2].trim();
        const answer = questionMatch[3].trim();
        console.log('✅ Found Q&A on same line');
        rows.push({
          question: question,
          answer: answer,
          round: roundName || undefined
        });
        currentQuestion = ''; // Clear since we've saved this pair
      } else {
        // Just question, answer should be on next line
        // Remove numbering prefix if present
        currentQuestion = line.replace(/^\d+\.\s*/, '').trim();
        console.log('📝 Found question, waiting for answer on next line:', currentQuestion.substring(0, 60));
      }
    } else {
      // Line without question mark - this MUST be an answer (or skipped if no question waiting)
      if (currentQuestion) {
        // We have a question waiting - this line is definitely the answer
        console.log('✅ Found answer for waiting question');
        rows.push({
          question: currentQuestion.trim(),
          answer: line.trim(),
          round: roundName || undefined
        });
        currentQuestion = ''; // Clear since we've saved this pair
      } else {
        // No current question - this line cannot be paired
        // Skip it (might be a section header, round name that wasn't caught, etc.)
        console.log('⏭️ Skipping line - no question waiting (might be header/round name):', line.substring(0, 50));
      }
    }
  }
  
  // Add last question if it exists (even without answer)
  if (currentQuestion) {
    console.log('Saving final question without answer');
    rows.push({
      question: currentQuestion.trim(),
      answer: '',
      round: roundName || undefined
    });
  }
  
  // Filter out any rows where question matches the round name (safety check)
  // Also filter out rows where question starts with the round name (in case of variations)
  const filteredRows = rows.filter(row => {
    if (!row.question) return true;
    
    const questionText = row.question.trim();
    
    // Exact match
    if (roundName && questionText === roundName.trim()) {
      console.log('⚠️ Filtering out row (exact match):', questionText);
      return false;
    }
    
    // Starts with round name (case-insensitive)
    if (roundName && questionText.toLowerCase().startsWith(roundName.toLowerCase().trim())) {
      console.log('⚠️ Filtering out row (starts with round name):', questionText);
      return false;
    }
    
    // Also check if question is suspiciously short and matches round name pattern
    if (roundName && questionText.length < 100 && 
        !questionText.includes('?') && 
        questionText.toLowerCase() === roundName.toLowerCase().trim()) {
      console.log('⚠️ Filtering out row (short, no ?, matches round name):', questionText);
      return false;
    }
    
    return true;
  });
  
  console.log(`📊 Final parsed rows: ${filteredRows.length} (${rows.length} before filtering)`);
  if (roundName) {
    console.log(`📊 Round name: "${roundName}"`);
    console.log(`📊 Checking if any rows still contain round name...`);
    filteredRows.forEach((row, idx) => {
      if (row.question && row.question.includes(roundName)) {
        console.log(`⚠️ Row ${idx} still contains round name:`, row.question.substring(0, 50));
      }
    });
  }
  
  return filteredRows;
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

