'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navigation from '../../../components/Navigation';

interface ParsedLine {
  id: string;
  text: string;
  type: 'round' | 'question' | 'answer' | 'unknown';
  round?: string;
  question?: string;
  answer?: string;
  suggestion?: {
    type: 'round' | 'question' | 'answer';
    confidence: number;
    reason: string;
  };
}

function ManualOrganizeContent() {
  const searchParams = useSearchParams();
  const [documentId, setDocumentId] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rawLines, setRawLines] = useState<string[]>([]);
  const [organizedData, setOrganizedData] = useState<ParsedLine[]>([]);
  const [currentRound, setCurrentRound] = useState('');
  
  useEffect(() => {
    // Get tokens from URL params or sessionStorage
    const urlAccessToken = searchParams.get('access_token');
    const urlRefreshToken = searchParams.get('refresh_token');
    
    if (urlAccessToken && urlRefreshToken) {
      sessionStorage.setItem('google_access_token', urlAccessToken);
      sessionStorage.setItem('google_refresh_token', urlRefreshToken);
      setAccessToken(urlAccessToken);
      setRefreshToken(urlRefreshToken);
    } else {
      const savedAccessToken = sessionStorage.getItem('google_access_token');
      const savedRefreshToken = sessionStorage.getItem('google_refresh_token');
      if (savedAccessToken && savedRefreshToken) {
        setAccessToken(savedAccessToken);
        setRefreshToken(savedRefreshToken);
      }
    }
  }, [searchParams]);

  const extractDocumentId = (urlOrId: string): string => {
    // If it's already just an ID (no slashes), return as-is
    if (!urlOrId.includes('/')) {
      return urlOrId.trim();
    }
    
    // Extract ID from Google Docs URL
    // Format: https://docs.google.com/document/d/DOCUMENT_ID/edit
    const match = urlOrId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    
    // If no match, try to use the last part of the URL
    const parts = urlOrId.split('/').filter(p => p);
    return parts[parts.length - 1] || urlOrId;
  };

  const handleFetchDocument = async () => {
    if (!documentId || !accessToken) {
      alert('Please enter a document ID and ensure you are authenticated');
      return;
    }

    const extractedId = extractDocumentId(documentId);
    console.log('Extracted document ID:', extractedId);

    setLoading(true);
    try {
      const response = await fetch('/api/google/docs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: extractedId,
          accessToken,
          refreshToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'Authentication failed. Please re-authenticate with Google.') {
          sessionStorage.removeItem('google_access_token');
          sessionStorage.removeItem('google_refresh_token');
          setAccessToken(null);
          setRefreshToken(null);
          alert('Authentication expired. Please sign in again.');
          return;
        }
        throw new Error(data.error || 'Failed to fetch document');
      }

      // Handle token refresh
      if (data.newAccessToken) {
        sessionStorage.setItem('google_access_token', data.newAccessToken);
        setAccessToken(data.newAccessToken);
      }

      // Extract raw text lines from the document
      const lines: string[] = data.rawTextLines || (data.rawText ? data.rawText.split('\n').filter((l: string) => l.trim().length > 0) : []);
      
      setRawLines(lines);
      
      // Initialize organized data with all lines as 'unknown' type
      const initialData: ParsedLine[] = lines.map((line: string, idx: number) => ({
        id: `line-${idx}`,
        text: line.trim(),
        type: 'unknown' as const,
      }));
      
      // Generate initial suggestions
      const withSuggestions = generateSuggestions(initialData);
      setOrganizedData(withSuggestions);
    } catch (error: any) {
      console.error('Error fetching document:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = () => {
    window.location.href = '/api/google/auth';
  };

  // Calculate similarity between two strings (Levenshtein distance)
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }
    return matrix[str2.length][str1.length];
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1.0;
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  };

  // Analyze patterns incrementally - detect patterns from recent classifications and apply forward
  const generateSuggestions = (data: ParsedLine[]): ParsedLine[] => {
    const suggestions = [...data];
    
    // Find the last classified section and detect its pattern
    let patternStartIndex = -1;
    let patternType: 'question-answer' | 'round' | null = null;
    let patternRound: string | null = null;
    
    // Look backwards from the end to find the most recent pattern
    for (let i = data.length - 1; i >= 0; i--) {
      const line = data[i];
      
      // If we find a classified line, check if there's a pattern
      if (line.type !== 'unknown') {
        // Check if this is part of a question-answer pattern
        if (line.type === 'question' && line.answer) {
          // Found a complete Q&A pair - check if previous lines follow this pattern
          patternStartIndex = i;
          patternType = 'question-answer';
          patternRound = line.round || null;
          break;
        } else if (line.type === 'round') {
          // Found a round name - this might start a new section
          patternStartIndex = i;
          patternType = 'round';
          patternRound = line.text;
          break;
        }
      }
    }
    
    // If we found a pattern, apply it forward to unknown lines
    if (patternStartIndex >= 0 && patternType) {
      let expectedNextType: 'question' | 'answer' | 'round' | null = null;
      
      if (patternType === 'question-answer') {
        // After a Q&A pair, expect another question
        expectedNextType = 'question';
      } else if (patternType === 'round') {
        // After a round name, expect a question
        expectedNextType = 'question';
      }
      
      // Apply pattern forward
      for (let i = patternStartIndex + 1; i < suggestions.length; i++) {
        const line = suggestions[i];
        
        // Stop if we hit a classified line (user broke the pattern)
        if (line.type !== 'unknown') {
          // Check if this classified line matches the expected pattern
          if (expectedNextType === 'question' && line.type === 'question') {
            // Pattern continues - next should be answer
            expectedNextType = 'answer';
          } else if (expectedNextType === 'answer' && line.type === 'answer') {
            // Pattern continues - next should be question
            expectedNextType = 'question';
          } else if (line.type === 'round') {
            // New round detected - reset pattern
            expectedNextType = 'question';
            patternRound = line.text;
          } else {
            // Pattern broken - stop suggesting
            break;
          }
          continue;
        }
        
        // Generate suggestion based on expected pattern
        if (expectedNextType === 'question') {
          const hasQuestionMark = line.text.includes('?');
          const hasFillInBlank = /_{3,}/.test(line.text);
          const isLong = line.text.length > 50;
          
          if (hasQuestionMark || hasFillInBlank || isLong) {
            line.suggestion = {
              type: 'question',
              confidence: hasQuestionMark ? 95 : hasFillInBlank ? 90 : 80,
              reason: hasQuestionMark ? 'Expected question (contains ?)' : 
                      hasFillInBlank ? 'Expected question (fill-in-blank)' :
                      'Expected question (pattern continuation)'
            };
            expectedNextType = 'answer'; // Next should be answer
          }
        } else if (expectedNextType === 'answer') {
          const isShort = line.text.length < 100;
          const hasNoQuestionMark = !line.text.includes('?');
          
          if (isShort && hasNoQuestionMark) {
            line.suggestion = {
              type: 'answer',
              confidence: 90,
              reason: 'Expected answer (pattern continuation)'
            };
            expectedNextType = 'question'; // Next should be question
          }
        } else if (expectedNextType === 'round') {
          const isShort = line.text.length < 100 && line.text.length > 10;
          const hasNoQuestionMark = !line.text.includes('?');
          
          if (isShort && hasNoQuestionMark) {
            line.suggestion = {
              type: 'round',
              confidence: 75,
              reason: 'Expected round name (pattern continuation)'
            };
            expectedNextType = 'question';
            patternRound = line.text;
          }
        }
      }
    }
    
    // Also check for obvious patterns (question marks, etc.) even without established pattern
    suggestions.forEach((line, idx) => {
      if (line.type !== 'unknown' || line.suggestion) {
        return; // Skip already classified or suggested lines
      }
      
      // Check for obvious question markers
      if (line.text.includes('?')) {
        line.suggestion = {
          type: 'question',
          confidence: 95,
          reason: 'Contains question mark'
        };
      } else if (/_{3,}/.test(line.text)) {
        line.suggestion = {
          type: 'question',
          confidence: 90,
          reason: 'Contains fill-in-the-blank pattern'
        };
      }
    });
    
    return suggestions;
  };

  const updateLineType = (id: string, type: ParsedLine['type']) => {
    setOrganizedData(prev => {
      const lineIndex = prev.findIndex(l => l.id === id);
      let newCurrentRound = currentRound;
      
      const updated = prev.map((line, idx) => {
        if (line.id === id) {
          const updatedLine = { ...line, type, suggestion: undefined };
          if (type === 'round') {
            updatedLine.round = line.text;
            newCurrentRound = line.text; // Update current round
            setCurrentRound(line.text);
          } else if (type === 'question') {
            updatedLine.question = line.text;
            // Assign to current round (or the most recent round before this line)
            updatedLine.round = newCurrentRound || findMostRecentRound(prev, idx) || undefined;
          } else if (type === 'answer') {
            updatedLine.answer = line.text;
          }
          return updatedLine;
        }
        
        // Auto-assign round to questions that come after a round name
        if (type === 'round' && idx > lineIndex && line.type === 'question' && !line.round) {
          return {
            ...line,
            round: newCurrentRound || undefined,
          };
        }
        
        return line;
      });
      
      // Regenerate suggestions after classification
      const withSuggestions = generateSuggestions(updated);
      
      // Auto-assign current round to all subsequent questions until next round
      return withSuggestions.map((line, idx) => {
        if (type === 'round' && idx > lineIndex && line.type === 'question' && !line.round) {
          return {
            ...line,
            round: newCurrentRound || undefined,
          };
        }
        return line;
      });
    });
  };
  
  // Helper function to find the most recent round name before a given index
  const findMostRecentRound = (data: ParsedLine[], beforeIndex: number): string | null => {
    for (let i = beforeIndex - 1; i >= 0; i--) {
      if (data[i].type === 'round') {
        return data[i].text;
      }
    }
    return null;
  };

  const setLineRound = (id: string, round: string) => {
    setOrganizedData(prev => prev.map(line => {
      if (line.id === id) {
        return { ...line, round };
      }
      return line;
    }));
  };

  const pairQuestionAnswer = (questionId: string, answerId: string, autoPairNext: boolean = true) => {
    setOrganizedData(prev => {
      const questionLine = prev.find(l => l.id === questionId);
      const answerLine = prev.find(l => l.id === answerId);
      
      if (!questionLine || !answerLine) return prev;
      
      const questionIndex = prev.findIndex(l => l.id === questionId);
      const answerIndex = prev.findIndex(l => l.id === answerId);
      
      const updated = prev.map(line => {
        if (line.id === questionId) {
          return {
            ...line,
            type: 'question' as const,
            question: line.text,
            answer: answerLine.text,
            round: currentRound || undefined,
            suggestion: undefined,
          };
        }
        if (line.id === answerId) {
          return {
            ...line,
            type: 'answer' as const,
            answer: line.text,
            suggestion: undefined,
          };
        }
        return line;
      });
      
      // Auto-pair subsequent Q&A pairs if enabled and pattern detected
      if (autoPairNext) {
        // Calculate the gap between question and answer
        const gap = answerIndex - questionIndex;
        
        // Try to auto-pair subsequent pairs with the same gap
        let currentQIndex = answerIndex + 1;
        let pairsCreated = 0;
        const maxAutoPairs = 10; // Limit to prevent runaway pairing
        
        while (currentQIndex < updated.length && pairsCreated < maxAutoPairs) {
          const currentLine = updated[currentQIndex];
          
          // Stop if we hit a classified line that breaks the pattern (round name, etc.)
          if (currentLine.type === 'round') {
            break; // New round detected, stop auto-pairing
          }
          
          // Look for next question (unknown line that could be a question)
          if (currentLine.type === 'unknown') {
            const looksLikeQuestion = currentLine.text.includes('?') || 
                                     /_{3,}/.test(currentLine.text) || 
                                     currentLine.text.length > 50;
            
            if (looksLikeQuestion) {
              // Found a potential question - check if there's an answer at the expected position
              const expectedAnswerIndex = currentQIndex + gap;
              
              if (expectedAnswerIndex < updated.length) {
                const potentialAnswer = updated[expectedAnswerIndex];
                
                // Check if it looks like an answer
                if (potentialAnswer.type === 'unknown' && 
                    potentialAnswer.text.length < 100 && 
                    !potentialAnswer.text.includes('?')) {
                  
                  // Auto-pair them
                  updated[currentQIndex] = {
                    ...currentLine,
                    type: 'question' as const,
                    question: currentLine.text,
                    answer: potentialAnswer.text,
                    round: currentRound || undefined,
                    suggestion: undefined,
                  };
                  
                  updated[expectedAnswerIndex] = {
                    ...potentialAnswer,
                    type: 'answer' as const,
                    answer: potentialAnswer.text,
                    suggestion: undefined,
                  };
                  
                  pairsCreated++;
                  // Move to after the answer to look for next question
                  currentQIndex = expectedAnswerIndex + 1;
                  continue;
                }
              }
            }
          } else if (currentLine.type === 'question' && !currentLine.answer) {
            // Found an unpaired question - try to pair it with the next line
            const nextLineIndex = currentQIndex + 1;
            if (nextLineIndex < updated.length) {
              const nextLine = updated[nextLineIndex];
              if (nextLine.type === 'unknown' && nextLine.text.length < 100 && !nextLine.text.includes('?')) {
                updated[currentQIndex] = {
                  ...currentLine,
                  answer: nextLine.text,
                  suggestion: undefined,
                };
                updated[nextLineIndex] = {
                  ...nextLine,
                  type: 'answer' as const,
                  answer: nextLine.text,
                  suggestion: undefined,
                };
                pairsCreated++;
                currentQIndex = nextLineIndex + 1;
                continue;
              }
            }
          }
          
          currentQIndex++;
        }
      }
      
      // Regenerate suggestions after pairing
      return generateSuggestions(updated);
    });
  };

  const deleteLine = (id: string) => {
    setOrganizedData(prev => {
      const filtered = prev.filter(line => line.id !== id);
      return generateSuggestions(filtered);
    });
  };
  
  const applySuggestionToAll = (suggestionType: 'round' | 'question' | 'answer') => {
    setOrganizedData(prev => {
      const updated = prev.map(line => {
        if (line.type === 'unknown' && line.suggestion && line.suggestion.type === suggestionType && line.suggestion.confidence >= 75) {
          const updatedLine = { ...line, type: suggestionType, suggestion: undefined };
          if (suggestionType === 'round') {
            updatedLine.round = line.text;
            setCurrentRound(line.text);
          } else if (suggestionType === 'question') {
            updatedLine.question = line.text;
            updatedLine.round = currentRound || undefined;
          } else if (suggestionType === 'answer') {
            updatedLine.answer = line.text;
          }
          return updatedLine;
        }
        return line;
      });
      return generateSuggestions(updated);
    });
  };

  const moveLine = (id: string, direction: 'up' | 'down') => {
    setOrganizedData(prev => {
      const index = prev.findIndex(l => l.id === id);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      
      const newData = [...prev];
      [newData[index], newData[newIndex]] = [newData[newIndex], newData[index]];
      return newData;
    });
  };

  const handleImport = async () => {
    // Extract Q&A pairs from organized data
    const pairs = organizedData
      .filter(line => line.type === 'question' && line.question && line.answer)
      .map(line => ({
        question: line.question!,
        answer: line.answer!,
        round: line.round || currentRound || undefined,
      }));

    if (pairs.length === 0) {
      alert('No valid question-answer pairs found. Please organize the data first.');
      return;
    }

    setLoading(true);
    try {
      // Import each pair
      let successCount = 0;
      let errorCount = 0;

      for (const pair of pairs) {
        try {
          const response = await fetch('/api/submit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              question: pair.question,
              answer: pair.answer,
              round: pair.round,
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }

      alert(`Import complete! ${successCount} items imported successfully, ${errorCount} errors.`);
      
      // Reset
      setOrganizedData([]);
      setRawLines([]);
      setDocumentId('');
    } catch (error: any) {
      console.error('Error importing:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const pairs = organizedData
      .filter(line => line.type === 'question' && line.question && line.answer)
      .map(line => ({
        question: line.question!,
        answer: line.answer!,
        round: line.round || currentRound || undefined,
      }));

    const blob = new Blob([JSON.stringify(pairs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'organized-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <Navigation />
      <h1>Manual Google Docs Organizer</h1>
      <p>Fetch raw content from a Google Doc and organize it yourself.</p>

      {!accessToken ? (
        <div>
          <p>Please sign in with Google to access documents.</p>
          <button onClick={handleSignIn} style={{ padding: '10px 20px', fontSize: '16px' }}>
            Sign in with Google
          </button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
            <label style={{ display: 'block', marginBottom: '10px' }}>
              Google Docs URL or ID:
              <input
                type="text"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                placeholder="https://docs.google.com/document/d/DOCUMENT_ID/edit or just DOCUMENT_ID"
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </label>
            <button
              onClick={handleFetchDocument}
              disabled={loading || !documentId}
              style={{ padding: '10px 20px', fontSize: '16px' }}
            >
              {loading ? 'Fetching...' : 'Fetch Document'}
            </button>
          </div>

          {rawLines.length > 0 && (
            <div>
              <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <h2>Organize Content ({organizedData.length} lines)</h2>
                <button onClick={exportData} style={{ padding: '8px 16px' }}>
                  Export JSON
                </button>
                <button onClick={handleImport} disabled={loading} style={{ padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white' }}>
                  {loading ? 'Importing...' : 'Import to Database'}
                </button>
              </div>

              <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '5px' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <label>
                    Current Round:
                    <input
                      type="text"
                      value={currentRound}
                      onChange={(e) => setCurrentRound(e.target.value)}
                      placeholder="Set default round name"
                      style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
                    />
                  </label>
                </div>
                <div style={{ fontSize: '12px', color: '#666', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <strong>Quick Actions:</strong>
                  <button
                    onClick={() => applySuggestionToAll('round')}
                    style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: '#fff3cd', border: '1px solid #ffc107' }}
                  >
                    Apply All Round Suggestions
                  </button>
                  <button
                    onClick={() => applySuggestionToAll('question')}
                    style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: '#d1ecf1', border: '1px solid #0dcaf0' }}
                  >
                    Apply All Question Suggestions
                  </button>
                  <button
                    onClick={() => applySuggestionToAll('answer')}
                    style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: '#d4edda', border: '1px solid #198754' }}
                  >
                    Apply All Answer Suggestions
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '10px' }}>
                {organizedData.map((line, idx) => (
                  <div
                    key={line.id}
                    style={{
                      padding: '15px',
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      backgroundColor: 
                        line.type === 'round' ? '#fff3cd' :
                        line.type === 'question' ? '#d1ecf1' :
                        line.type === 'answer' ? '#d4edda' :
                        '#f8f9fa',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                          Line {idx + 1}
                        </div>
                        <div style={{ fontSize: '14px', wordBreak: 'break-word' }}>
                          {line.text}
                        </div>
                        {line.type === 'question' && line.answer && (
                          <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#e8f5e9', borderRadius: '3px' }}>
                            <strong>Answer:</strong> {line.answer}
                          </div>
                        )}
                        {line.round && (
                          <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
                            Round: {line.round}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {line.suggestion && line.type === 'unknown' && (
                          <div style={{ 
                            padding: '5px', 
                            fontSize: '11px', 
                            backgroundColor: '#e3f2fd', 
                            borderRadius: '3px',
                            border: '1px solid #2196F3',
                            marginBottom: '5px'
                          }}>
                            💡 <strong>{line.suggestion.type}</strong> ({line.suggestion.confidence}%) - {line.suggestion.reason}
                            <button
                              onClick={() => updateLineType(line.id, line.suggestion!.type)}
                              style={{ 
                                marginLeft: '5px', 
                                padding: '2px 6px', 
                                fontSize: '10px',
                                backgroundColor: '#2196F3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '2px',
                                cursor: 'pointer'
                              }}
                            >
                              Apply
                            </button>
                          </div>
                        )}
                        <select
                          value={line.type}
                          onChange={(e) => updateLineType(line.id, e.target.value as ParsedLine['type'])}
                          style={{ padding: '5px' }}
                        >
                          <option value="unknown">Unknown</option>
                          <option value="round">Round Name</option>
                          <option value="question">Question</option>
                          <option value="answer">Answer</option>
                        </select>
                        {line.type === 'question' && (
                          <input
                            type="text"
                            value={line.round || ''}
                            onChange={(e) => setLineRound(line.id, e.target.value)}
                            placeholder="Round name"
                            style={{ padding: '5px', fontSize: '12px' }}
                          />
                        )}
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button
                            onClick={() => moveLine(line.id, 'up')}
                            disabled={idx === 0}
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveLine(line.id, 'down')}
                            disabled={idx === organizedData.length - 1}
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => deleteLine(line.id)}
                            style={{ padding: '5px 10px', fontSize: '12px', backgroundColor: '#f44336', color: 'white' }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {line.type === 'question' && !line.answer && (() => {
                      // Find the most likely answer based on pattern
                      const questionIndex = organizedData.findIndex(l => l.id === line.id);
                      
                      // Check if there's an established pattern (previous Q&A pairs)
                      let suggestedAnswerId: string | undefined;
                      let gap = 1; // Default: answer is next line
                      
                      // Look backwards to find the most recent Q&A pair to determine gap
                      for (let i = questionIndex - 1; i >= 0; i--) {
                        const prevLine = organizedData[i];
                        if (prevLine.type === 'question' && prevLine.answer) {
                          // Found a paired question - find its answer index
                          const answerIndex = organizedData.findIndex(l => l.text === prevLine.answer);
                          if (answerIndex >= 0) {
                            gap = answerIndex - i;
                            break;
                          }
                        }
                      }
                      
                      // Suggest answer based on gap pattern
                      const expectedAnswerIndex = questionIndex + gap;
                      if (expectedAnswerIndex < organizedData.length) {
                        const potentialAnswer = organizedData[expectedAnswerIndex];
                        if (potentialAnswer.type === 'unknown' && 
                            potentialAnswer.text.length < 100 && 
                            !potentialAnswer.text.includes('?')) {
                          suggestedAnswerId = potentialAnswer.id;
                        }
                      }
                      
                      // Fallback: just use next unknown line
                      if (!suggestedAnswerId) {
                        const nextUnknownLine = organizedData.slice(questionIndex + 1).find(l => l.type === 'unknown');
                        suggestedAnswerId = nextUnknownLine?.id;
                      }
                      
                      return (
                        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff9c4', borderRadius: '3px' }}>
                          <div style={{ fontSize: '12px', marginBottom: '5px' }}>Pair with answer:</div>
                          {suggestedAnswerId && (() => {
                            const suggestedLine = organizedData.find(l => l.id === suggestedAnswerId);
                            return (
                              <div style={{ marginBottom: '5px', padding: '5px', backgroundColor: '#e3f2fd', borderRadius: '3px', fontSize: '11px' }}>
                                💡 Suggested (pattern): {suggestedLine?.text.substring(0, 50)}{suggestedLine && suggestedLine.text.length > 50 ? '...' : ''}
                                <button
                                  onClick={() => pairQuestionAnswer(line.id, suggestedAnswerId!, true)}
                                  style={{ 
                                    marginLeft: '5px', 
                                    padding: '2px 6px', 
                                    fontSize: '10px',
                                    backgroundColor: '#2196F3',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '2px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Pair & Auto-continue
                                </button>
                              </div>
                            );
                          })()}
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                pairQuestionAnswer(line.id, e.target.value, false); // Don't auto-pair if manually selected
                                e.target.value = '';
                              }
                            }}
                            style={{ width: '100%', padding: '5px' }}
                          >
                            <option value="">Select answer...</option>
                            {organizedData
                              .filter(l => l.type === 'answer' || (l.type === 'unknown' && l.id !== line.id))
                              .map(l => (
                                <option key={l.id} value={l.id} style={l.id === suggestedAnswerId ? { fontWeight: 'bold', backgroundColor: '#e3f2fd' } : {}}>
                                  {l.text.substring(0, 60)}{l.text.length > 60 ? '...' : ''}
                                </option>
                              ))}
                          </select>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ManualOrganizePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ManualOrganizeContent />
    </Suspense>
  );
}

