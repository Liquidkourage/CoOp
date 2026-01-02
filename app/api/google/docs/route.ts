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

// Simple fallback: Extract all text lines as-is
function extractAllTextLinesSimple(content: any[]): string[] {
  const lines: string[] = [];
  
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
    if (text) {
      // Split on newlines to get individual lines
      const splitLines = text.split('\n').map(l => l.trim()).filter(l => l);
      lines.push(...splitLines);
    }
  });
  
  return lines;
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
  
  // Try numbered question format FIRST (most appropriate for Q&A format)
  if (rows.length === 0) {
    console.log('Trying numbered question format parsing');
    const numberedRows = parseNumberedQuestions(doc.body.content);
    console.log(`Numbered question parsing found ${numberedRows.length} rows`);
    if (numberedRows.length > 0) {
      rows.push(...numberedRows);
    }
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
  
  // If STILL no rows, fall back to simple line extraction - just extract all text lines
  // User can manually pair them in the UI
  if (rows.length === 0) {
    console.log('All parsing methods failed, falling back to simple line extraction');
    const simpleRows = extractAllTextLinesSimple(doc.body.content);
    console.log(`Simple extraction found ${simpleRows.length} lines`);
    // Return as raw lines - user will manually pair them
    return simpleRows.map((line, idx) => ({
      lineNumber: idx + 1,
      text: line,
      isQuestion: line.includes('?'),
      isAnswer: false
    }));
  }
  
  // Final safety check: Remove any rows where the question looks like a round name
  // BUT keep FitB questions and questions with answers
  const filteredRows = rows.filter(row => {
    if (!row.question) return true;
    
    const questionText = row.question.trim();
    const hasAnswer = row.answer && row.answer.trim().length > 0;
    const hasFillInBlank = /_{3,}/.test(questionText);
    
    // Keep FitB questions and questions with answers
    if (hasFillInBlank || hasAnswer) {
      return true;
    }
    
    // Skip rows where question is suspiciously round-name-like
    // (short, no question mark, no question words, not numbered, not FitB)
    const isShort = questionText.length < 100;
    const hasNoQuestionMark = !questionText.includes('?');
    const isNotNumbered = !/^\d+\./.test(questionText);
    const hasNoQuestionWords = !/\b(what|who|when|where|why|how|which|whose|whom)\b/i.test(questionText);
    
    if (isShort && hasNoQuestionMark && isNotNumbered && hasNoQuestionWords && !hasFillInBlank) {
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

// Parse matching format (A → B): Given A, what is B?
function parseMatchingFormat(lines: string[], roundName?: string) {
  const rows: Array<{question: string; answer: string; round?: string}> = [];
  
  console.log('🔗 Parsing matching format,', lines.length, 'lines');
  
  for (let i = 0; i < lines.length; i += 2) {
    const lineA = lines[i]?.trim();
    const lineB = lines[i + 1]?.trim();
    
    if (!lineA) continue;
    
    // Handle different formats:
    // 1. "A: [text]" → "B: [answer]"
    // 2. "[text] → [answer]"
    // 3. Just two lines: first is A, second is B
    
    let questionPart = lineA;
    let answerPart = lineB || '';
    
    // Remove "A:" or "B:" prefixes if present
    questionPart = questionPart.replace(/^[A-Z]:\s*/i, '').trim();
    answerPart = answerPart.replace(/^[A-Z]:\s*/i, '').trim();
    
    // Check for arrow format: "text → answer"
    if (lineA.includes('→')) {
      const parts = lineA.split('→').map(p => p.trim());
      if (parts.length === 2) {
        questionPart = parts[0];
        answerPart = parts[1];
      }
    }
    
    // Format as question: "Given [A], what is [B]?"
    const question = `Given ${questionPart}, what is ${answerPart || 'the answer'}?`;
    const answer = answerPart || '';
    
    if (questionPart) {
      rows.push({
        question: question,
        answer: answer,
        round: roundName || undefined
      });
      console.log(`✅ Parsed matching pair: "${questionPart}" → "${answerPart}"`);
    }
  }
  
  console.log(`📊 Parsed ${rows.length} matching pairs`);
  return rows;
}

// Parse numbered questions format: "Question text? Answer" (answer on same or next line)
function parseNumberedQuestions(content: any[]): any[] {
  const rows: any[] = [];
  let roundName = '';
  const allText: string[] = [];
  
  // Extract text from each paragraph, splitting on vertical tabs (\u000b) which separate Q&A
  function extractParagraphLines(node: any): string[] {
    const lines: string[] = [];
    
    if (node.paragraph && node.paragraph.elements) {
      let currentLine = '';
      
      node.paragraph.elements.forEach((elem: any) => {
        if (elem.textRun) {
          const content = elem.textRun.content || '';
          
          // Split on vertical tab - this separates Q&A in Google Docs
          if (content.includes('\u000b')) {
            const parts = content.split('\u000b');
            
            // Add everything before the vertical tab to current line
            currentLine += parts[0];
            
            // Push current line (should be complete question ending with ?)
            if (currentLine.trim()) {
              lines.push(currentLine.trim());
            }
            
            // Everything after the vertical tab starts new line (the answer)
            // Join any remaining parts (in case there are multiple vertical tabs)
            currentLine = parts.slice(1).join('\u000b');
          } else {
            // No vertical tab - append to current line
            currentLine += content;
          }
        }
      });
      
      // Add final line
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }
    }
    
    return lines;
  }
  
  // Process content to extract each paragraph, splitting on vertical tabs
  function processContent(nodes: any[], depth: number = 0) {
    if (!nodes || !Array.isArray(nodes)) {
      return;
    }
    
    nodes.forEach((node, idx) => {
      // Skip section breaks and other non-content nodes
      if (node.sectionBreak) {
        return;
      }
      
      if (node.paragraph) {
        const lines = extractParagraphLines(node);
        lines.forEach(line => {
          if (line && line !== '\n' && line.trim()) {
            allText.push(line);
          }
        });
      }
      
      // Recursively process nested content
      if (node.content && Array.isArray(node.content)) {
        processContent(node.content, depth + 1);
      }
      
      // Also check for elements array (sometimes content is nested here)
      if (node.elements && Array.isArray(node.elements)) {
        processContent(node.elements, depth + 1);
      }
    });
  }
  
  console.log('🔄 Starting to process content, total nodes:', content?.length || 0);
  processContent(content);
  console.log('✅ Finished processing content, extracted', allText.length, 'lines');
  
  console.log('📝 All extracted text lines:', allText.length);
  if (allText.length > 0) {
    console.log('📝 First 10 lines:', allText.slice(0, 10).map((l, i) => `${i}: "${l.substring(0, 80)}"`));
  }
  
  if (allText.length === 0) {
    console.log('⚠️ No text lines extracted');
    return rows;
  }
  
  // First line is likely the round name if it's short and doesn't have a question mark
  const firstLine = allText[0].trim();
  const isRoundName = firstLine.length < 100 && 
                      !firstLine.includes('?') && 
                      !/^\d+\./.test(firstLine) &&
                      !/\b(what|who|when|where|why|how|which|whose|whom)\b/i.test(firstLine);
  
  if (isRoundName) {
    roundName = firstLine;
    console.log('✅ Round name:', roundName);
    
    // Check if this is an audio/visual round - skip it
    const isAudioVisual = /\b(audio|visual|AV|A\/V|sound|video|listen|watch|hear|see)\b/i.test(roundName);
    if (isAudioVisual) {
      console.log('⏭️ Skipping audio/visual round:', roundName);
      return []; // Return empty array - skip this round entirely
    }
    
    allText.shift(); // Remove from processing
    console.log('✅ Remaining lines:', allText.length);
  } else {
    console.log('⚠️ First line does not look like round name:', firstLine.substring(0, 50));
  }
  
  // Check if this is a matching/pairing round (A → B format)
  // Look for patterns like "A → B", "A/B", "match", "pair", or check if round name suggests matching
  const isMatchingRound = roundName && (
    /\b(match|pair|matching|pairing|A\s*→\s*B|A\s*\/\s*B|given\s+A|presented\s+with\s+A)\b/i.test(roundName) ||
    /→/.test(roundName) ||
    // Film/subtitle matching patterns
    /\b(name\s+the|film|movie|sequel|subtitle|title)\b/i.test(roundName)
  );
  
  // Also check first few lines for matching patterns
  const hasMatchingPattern = allText.slice(0, 5).some(line => 
    /→/.test(line) || /^[A-Z]:\s/.test(line.trim()) || /\b[A-Z]\s*→\s*[A-Z]\b/i.test(line)
  );
  
  // Check if we have pairs of short lines (likely subtitle → film title format)
  // Pattern: alternating short lines (no question marks, no FitB) that look like titles/subtitles
  const hasTitlePairs = allText.length >= 4 && 
    allText.slice(0, 6).every((line, idx) => {
      const trimmed = line.trim();
      return trimmed.length > 0 && 
             trimmed.length < 100 && 
             !trimmed.includes('?') && 
             !/_{3,}/.test(trimmed) &&
             !/\b(what|who|when|where|why|how|which|whose|whom)\b/i.test(trimmed);
    });
  
  const useMatchingFormat = isMatchingRound || hasMatchingPattern || hasTitlePairs;
  
  if (useMatchingFormat) {
    console.log('🔗 Detected matching/pairing round format (A → B)');
    return parseMatchingFormat(allText, roundName);
  }
  
  // Process remaining lines - look for question-answer pairs
  // Pattern: Question (has ?) followed by Answer (no ?, usually short)
  let currentQuestion = '';
  let currentRoundName = roundName;
  let matchingModeStartIndex = -1;
  
  console.log('📝 Starting to process', allText.length, 'lines for Q&A pairs');
  console.log('📝 First 10 lines preview:', allText.slice(0, 10).map((l, idx) => `${idx}: "${l.substring(0, 60)}${l.length > 60 ? '...' : ''}"`));
  
  for (let i = 0; i < allText.length; i++) {
    const line = allText[i].trim();
    if (!line || line === '\n') {
      continue;
    }
    
    const nextLine = i < allText.length - 1 ? allText[i + 1]?.trim() : null;
    
    // Check if this line is a new round name (appears mid-document)
    // Look for patterns like "Name the...", "FitB:", or other round indicators
    const looksLikeRoundName = line.length < 150 && 
                               !line.includes('?') && 
                               !/_{3,}/.test(line) &&
                               (
                                 /^(name\s+the|fitb:|round|^[A-Z][^?]*$)/i.test(line) ||
                                 (line.length < 100 && !/\b(what|who|when|where|why|how|which|whose|whom)\b/i.test(line))
                               );
    
    // Check if this looks like a film/subtitle matching round
    const isFilmRoundName = /\b(name\s+the.*film|film.*sequel|film.*subtitle|subtitle.*film)\b/i.test(line);
    
    if (looksLikeRoundName && isFilmRoundName && matchingModeStartIndex === -1) {
      // Found a film round - switch to matching mode from this point
      console.log('🔗 Detected film/subtitle round mid-document:', line);
      matchingModeStartIndex = i;
      currentRoundName = line;
      // Process everything before this as regular Q&A, then switch to matching
      break; // We'll handle this after the loop
    }
    
    // Check if line is a question:
    // 1. Contains a question mark (?)
    // 2. Contains fill-in-the-blank patterns (____, _____, etc.)
    // 3. Is a long line (likely a question) followed by a short answer
    const hasQuestionMark = line.includes('?');
    const hasFillInBlank = /_{3,}/.test(line); // 3 or more underscores
    const isLongLine = line.length > 50;
    const nextLineIsShort = nextLine && nextLine.length < 50 && !nextLine.includes('?') && !/_{3,}/.test(nextLine);
    
    const isQuestion = hasQuestionMark || (hasFillInBlank && isLongLine) || (isLongLine && nextLineIsShort);
    
    if (isQuestion) {
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
      
      // If it has a question mark, try to split question and answer on the same line
      if (hasQuestionMark) {
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
          currentQuestion = line.replace(/^\d+\.\s*/, '').trim();
          console.log('📝 Found question (with ?), waiting for answer on next line:', currentQuestion.substring(0, 60));
        }
      } else {
        // FitB or long format question without "?" - answer should be on next line
        currentQuestion = line.replace(/^\d+\.\s*/, '').trim();
        console.log('📝 Found question (FitB/long format), waiting for answer on next line:', currentQuestion.substring(0, 60));
      }
    } else {
      // Line without question mark - could be an answer or a question in a different format
      if (currentQuestion) {
        // We have a question waiting - this line is the answer
        console.log('✅ Found answer for waiting question');
        rows.push({
          question: currentQuestion.trim(),
          answer: line.trim(),
          round: roundName || undefined
        });
        currentQuestion = ''; // Clear since we've saved this pair
      } else {
        // No current question - check if this might be a question followed by a short answer
        // (Fill-in-the-blank or other formats)
        if (hasFillInBlank || (isLongLine && nextLineIsShort)) {
          // This looks like a question, wait for the answer
          currentQuestion = line;
          console.log('📝 Found question (FitB or long format), waiting for answer:', line.substring(0, 60));
        } else {
          // Skip short lines that don't look like questions
          // (might be section headers, round names, etc.)
          console.log('⏭️ Skipping line - no question waiting:', line.substring(0, 50));
        }
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
  // BUT keep FitB questions and questions with answers
  const filteredRows = rows.filter(row => {
    if (!row.question) return true;
    
    const questionText = row.question.trim();
    const hasAnswer = row.answer && row.answer.trim().length > 0;
    const hasFillInBlank = /_{3,}/.test(questionText);
    
    // Keep FitB questions and questions with answers
    if (hasFillInBlank || hasAnswer) {
      return true;
    }
    
    // Exact match with round name
    if (roundName && questionText === roundName.trim()) {
      console.log('⚠️ Filtering out row (exact match with round name):', questionText);
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
        !hasFillInBlank &&
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

