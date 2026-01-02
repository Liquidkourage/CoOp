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

  // Analyze patterns and generate suggestions
  const generateSuggestions = (data: ParsedLine[]): ParsedLine[] => {
    const suggestions = [...data];
    
    // Analyze patterns from user's previous classifications
    const roundPatterns: string[] = [];
    const questionPatterns: { hasQuestionMark: boolean; avgLength: number; count: number } = { hasQuestionMark: false, avgLength: 0, count: 0 };
    const answerPatterns: { avgLength: number; count: number; afterQuestion: boolean } = { avgLength: 0, count: 0, afterQuestion: false };
    
    let questionCount = 0;
    let answerCount = 0;
    let roundCount = 0;
    let totalQuestionLength = 0;
    let totalAnswerLength = 0;
    
    // Analyze classified lines
    data.forEach((line, idx) => {
      if (line.type === 'round') {
        roundCount++;
        roundPatterns.push(line.text);
      } else if (line.type === 'question') {
        questionCount++;
        totalQuestionLength += line.text.length;
        if (line.text.includes('?')) {
          questionPatterns.hasQuestionMark = true;
        }
      } else if (line.type === 'answer') {
        answerCount++;
        totalAnswerLength += line.text.length;
        // Check if this answer follows a question
        if (idx > 0 && data[idx - 1].type === 'question') {
          answerPatterns.afterQuestion = true;
        }
      }
    });
    
    if (questionCount > 0) {
      questionPatterns.avgLength = totalQuestionLength / questionCount;
      questionPatterns.count = questionCount;
    }
    if (answerCount > 0) {
      answerPatterns.avgLength = totalAnswerLength / answerCount;
      answerPatterns.count = answerCount;
    }
    
    // Generate suggestions for unknown lines
    suggestions.forEach((line, idx) => {
      if (line.type !== 'unknown') {
        return; // Skip already classified lines
      }
      
      const lineSuggestions: Array<{ type: 'round' | 'question' | 'answer'; confidence: number; reason: string }> = [];
      
      // Check if it looks like a round name
      if (roundCount > 0) {
        const isShort = line.text.length < 100;
        const hasNoQuestionMark = !line.text.includes('?');
        const matchesRoundPattern = roundPatterns.some(pattern => {
          const similarity = calculateSimilarity(line.text.toLowerCase(), pattern.toLowerCase());
          return similarity > 0.7 || (isShort && hasNoQuestionMark && line.text.length > 10);
        });
        
        if (matchesRoundPattern || (isShort && hasNoQuestionMark && line.text.length > 10 && line.text.length < 80)) {
          lineSuggestions.push({
            type: 'round',
            confidence: matchesRoundPattern ? 85 : 60,
            reason: matchesRoundPattern ? 'Similar to previous round names' : 'Short line without question mark'
          });
        }
      }
      
      // Check if it looks like a question
      if (questionCount > 0) {
        const hasQuestionMark = line.text.includes('?');
        const hasFillInBlank = /_{3,}/.test(line.text);
        const lengthMatch = questionPatterns.avgLength > 0 && Math.abs(line.text.length - questionPatterns.avgLength) < 50;
        
        if (hasQuestionMark) {
          lineSuggestions.push({
            type: 'question',
            confidence: 95,
            reason: 'Contains question mark'
          });
        } else if (hasFillInBlank) {
          lineSuggestions.push({
            type: 'question',
            confidence: 90,
            reason: 'Contains fill-in-the-blank pattern'
          });
        } else if (lengthMatch && line.text.length > 50) {
          lineSuggestions.push({
            type: 'question',
            confidence: 70,
            reason: 'Similar length to previous questions'
          });
        }
      }
      
      // Check if it looks like an answer
      if (answerCount > 0) {
        const isShort = line.text.length < 100;
        const hasNoQuestionMark = !line.text.includes('?');
        const lengthMatch = answerPatterns.avgLength > 0 && Math.abs(line.text.length - answerPatterns.avgLength) < 30;
        const followsQuestion = idx > 0 && data[idx - 1].type === 'question';
        
        if (followsQuestion && isShort && hasNoQuestionMark) {
          lineSuggestions.push({
            type: 'answer',
            confidence: 90,
            reason: 'Short line following a question'
          });
        } else if (lengthMatch && isShort && hasNoQuestionMark) {
          lineSuggestions.push({
            type: 'answer',
            confidence: 75,
            reason: 'Similar length to previous answers'
          });
        }
      }
      
      // Set the best suggestion
      if (lineSuggestions.length > 0) {
        const bestSuggestion = lineSuggestions.reduce((best, current) => 
          current.confidence > best.confidence ? current : best
        );
        line.suggestion = bestSuggestion;
      } else {
        line.suggestion = undefined;
      }
    });
    
    return suggestions;
  };

  const updateLineType = (id: string, type: ParsedLine['type']) => {
    setOrganizedData(prev => {
      const updated = prev.map(line => {
        if (line.id === id) {
          const updatedLine = { ...line, type, suggestion: undefined };
          if (type === 'round') {
            updatedLine.round = line.text;
            setCurrentRound(line.text);
          } else if (type === 'question') {
            updatedLine.question = line.text;
            updatedLine.round = currentRound || undefined;
          } else if (type === 'answer') {
            updatedLine.answer = line.text;
          }
          return updatedLine;
        }
        return line;
      });
      
      // Regenerate suggestions after classification
      return generateSuggestions(updated);
    });
  };

  const setLineRound = (id: string, round: string) => {
    setOrganizedData(prev => prev.map(line => {
      if (line.id === id) {
        return { ...line, round };
      }
      return line;
    }));
  };

  const pairQuestionAnswer = (questionId: string, answerId: string) => {
    setOrganizedData(prev => {
      const questionLine = prev.find(l => l.id === questionId);
      const answerLine = prev.find(l => l.id === answerId);
      
      if (!questionLine || !answerLine) return prev;
      
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
                    
                    {line.type === 'question' && !line.answer && (
                      <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff9c4', borderRadius: '3px' }}>
                        <div style={{ fontSize: '12px', marginBottom: '5px' }}>Pair with answer:</div>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              pairQuestionAnswer(line.id, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          style={{ width: '100%', padding: '5px' }}
                        >
                          <option value="">Select answer...</option>
                          {organizedData
                            .filter(l => l.type === 'answer' || (l.type === 'unknown' && l.id !== line.id))
                            .map(l => (
                              <option key={l.id} value={l.id}>
                                {l.text.substring(0, 60)}{l.text.length > 60 ? '...' : ''}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
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

