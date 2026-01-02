'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '../../contexts/UserContext';
import Navigation from '../../components/Navigation';

// Field definitions with detection patterns (shared with CSV import)
const FIELD_DEFINITIONS = [
  {
    value: 'question',
    label: 'Question',
    required: true,
    description: 'The actual trivia question text',
    patterns: ['question', 'q', 'text', 'prompt', 'query', 'item', 'content']
  },
  {
    value: 'answer',
    label: 'Answer',
    required: false,
    description: 'The correct answer to the question',
    patterns: ['answer', 'a', 'correct', 'solution', 'key', 'response']
  },
  {
    value: 'alternateAnswers',
    label: 'Alternative Answers',
    required: false,
    description: 'Acceptable variations of the correct answer (comma-separated)',
    patterns: ['alternate', 'alternative', 'variants', 'answervariants', 'answer variants', 'alt answer', 'alt answers', 'acceptable', 'variations']
  },
  // Creator is always auto-filled from logged-in user, not mapped from columns
  {
    value: 'topics',
    label: 'Topics',
    required: false,
    description: 'Categories or subjects (comma-separated)',
    patterns: ['topic', 'category', 'subject', 'tags', 'theme', 'genre']
  },
  {
    value: 'options',
    label: 'Incorrect Options',
    required: false,
    description: 'Multiple-choice distractors (semicolon-delimited)',
    patterns: ['options', 'choices', 'alternatives', 'distractors', 'incorrect']
  },
  {
    value: 'date',
    label: 'Date',
    required: false,
    description: 'Date (YYYY-MM-DD format)',
    patterns: ['date', 'created', 'published', 'timestamp']
  },
  {
    value: 'round',
    label: 'Round',
    required: false,
    description: 'Round name',
    patterns: ['round', 'rd', 'round name']
  },
  {
    value: 'set',
    label: 'Set/Event',
    required: false,
    description: 'Quiz set or event name',
    patterns: ['set', 'event', 'quiz', 'game']
  },
  {
    value: 'explanation',
    label: 'Explanation',
    required: false,
    description: 'Explanation or rationale',
    patterns: ['explanation', 'rationale', 'why', 'reason']
  },
  {
    value: 'notes',
    label: 'Host Notes',
    required: false,
    description: 'Internal notes for hosts',
    patterns: ['notes', 'note', 'host notes', 'internal']
  },
  {
    value: 'source',
    label: 'Source',
    required: false,
    description: 'Source URL or reference',
    patterns: ['source', 'url', 'reference', 'link']
  },
  {
    value: 'media',
    label: 'Media URL',
    required: false,
    description: 'URL to audio or visual media (audio clip, image, video)',
    patterns: ['media', 'audio', 'video', 'image', 'url', 'link', 'file', 'mp3', 'mp4', 'jpg', 'png']
  },
  {
    value: 'types',
    label: 'Question Format/Type',
    required: false,
    description: 'Question format/type (comma-separated): Multiple Choice, Free Response, Matching, True/False, etc.',
    patterns: ['format', 'type', 'types', 'question type', 'question format', 'qtype', 'qformat', 'style', 'kind']
  },
  {
    value: 'skip',
    label: 'Skip',
    required: false,
    description: 'Ignore this column',
    patterns: []
  }
];

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  confidence: number;
}

interface ParsedRow {
  [key: string]: any;
}

interface PreviewRow {
  id: number;
  data: Record<string, any>;
  mapped: Record<string, any>;
  errors: string[];
  warnings: string[];
}

// Auto-detect column mappings based on header names
function detectColumnMappings(headers: string[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = [];
  const usedFields = new Set<string>();
  
  headers.forEach(header => {
    const headerLower = header.toLowerCase().trim();
    let bestMatch: { field: string; confidence: number } | null = null;
    
    FIELD_DEFINITIONS.forEach(field => {
      if (field.value === 'skip') return;
      
      field.patterns.forEach(pattern => {
        if (headerLower.includes(pattern)) {
          const confidence = pattern.length / headerLower.length * 100;
          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = { field: field.value, confidence: Math.min(confidence, 95) };
          }
        }
      });
    });
    
    // Special handling for common patterns
    if (!bestMatch) {
      if (/^[a-d]$/i.test(header.trim()) || /option\s*\d+/i.test(headerLower)) {
        bestMatch = { field: 'options', confidence: 80 };
      }
    }
    
    // Only use match if confidence is reasonable (avoid false positives)
    if (bestMatch && bestMatch.confidence > 30 && !usedFields.has(bestMatch.field)) {
      mappings.push({
        sourceColumn: header,
        targetField: bestMatch.field,
        confidence: bestMatch.confidence
      });
      if (bestMatch.field !== 'options' && bestMatch.field !== 'topics') {
        usedFields.add(bestMatch.field);
      }
    } else {
      mappings.push({
        sourceColumn: header,
        targetField: 'skip',
        confidence: 0
      });
    }
  });
  
  return mappings;
}

function GoogleDocsImportPageContent() {
  const { currentUser } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [documentId, setDocumentId] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [editableRows, setEditableRows] = useState<Array<{question: string; answer: string; round?: string}>>([]);
  const [roundName, setRoundName] = useState<string>('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; imported: number; errors: number } | null>(null);

  useEffect(() => {
    // Check for access token from OAuth callback
    const token = searchParams.get('access_token');
    const errorParam = searchParams.get('error');
    
    if (errorParam) {
      setError(`Authentication error: ${errorParam}`);
    }
    
    if (token) {
      setAccessToken(token);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('google_access_token', token);
        const refreshTokenParam = searchParams.get('refresh_token');
        if (refreshTokenParam) {
          setRefreshToken(refreshTokenParam);
          sessionStorage.setItem('google_refresh_token', refreshTokenParam);
        }
      }
    } else if (typeof window !== 'undefined') {
      const storedToken = sessionStorage.getItem('google_access_token');
      const storedRefreshToken = sessionStorage.getItem('google_refresh_token');
      if (storedToken) {
        setAccessToken(storedToken);
      }
      if (storedRefreshToken) {
        setRefreshToken(storedRefreshToken);
      }
    }
  }, [searchParams]);

  const updateMapping = (sourceColumn: string, targetField: string) => {
    setMappings(prev => prev.map(m => 
      m.sourceColumn === sourceColumn 
        ? { ...m, targetField, confidence: targetField === 'skip' ? 0 : 100 } 
        : m
    ));
    updatePreview();
  };

  const updatePreview = useCallback(() => {
    if (parsedData.length === 0 || mappings.length === 0) return;
    
    const preview: PreviewRow[] = parsedData.slice(0, 5).map((row, idx) => {
      const mapped: Record<string, any> = {};
      const errors: string[] = [];
      const warnings: string[] = [];
      
      mappings.forEach(mapping => {
        if (mapping.targetField === 'skip') return;
        
        const value = row[mapping.sourceColumn];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          mapped[mapping.targetField] = value;
        }
      });
      
      if (!mapped.question && !mapped.description) {
        errors.push('Missing required field: Question');
      }
      
      return {
        id: idx + 1,
        data: row,
        mapped,
        errors,
        warnings
      };
    });
    
    setPreviewRows(preview);
  }, [parsedData, mappings]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  const handleAuthenticate = async () => {
    try {
      const response = await fetch('/api/google/auth');
      const data = await response.json();
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setError('Failed to get authentication URL');
      }
    } catch (err: any) {
      setError(`Authentication error: ${err.message}`);
    }
  };

  const extractDocumentId = (url: string): string | null => {
    const patterns = [
      /\/d\/([a-zA-Z0-9-_]+)/,
      /id=([a-zA-Z0-9-_]+)/,
      /^([a-zA-Z0-9-_]+)$/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  };

  const handleFetchDocument = async () => {
    if (!accessToken) {
      setError('Please authenticate with Google first');
      return;
    }
    
    if (!documentId.trim()) {
      setError('Please enter a Google Docs URL or document ID');
      return;
    }
    
    setLoading(true);
    setError(null);
    setParsedData([]);
    setHeaders([]);
    setMappings([]);
    setPreviewRows([]);
    
    try {
      const docId = extractDocumentId(documentId.trim());
      
      if (!docId) {
        setError('Invalid Google Docs URL or document ID');
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/google/docs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentId: docId,
          accessToken: accessToken,
          refreshToken: refreshToken
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // If authentication failed, clear tokens and prompt re-auth
        if (data.requiresReauth) {
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('google_access_token');
            sessionStorage.removeItem('google_refresh_token');
          }
          setAccessToken(null);
          setRefreshToken(null);
          setError(`${data.error}. Please click "Sign in with Google" again.`);
          setLoading(false);
          return;
        }
        throw new Error(data.error || 'Failed to fetch document');
      }
      
      // Update access token if it was refreshed
      if (data.newAccessToken && typeof window !== 'undefined') {
        setAccessToken(data.newAccessToken);
        sessionStorage.setItem('google_access_token', data.newAccessToken);
      }
      
      const rows = data.data || [];
      setParsedData(rows);
      setDocumentTitle(data.documentTitle || 'Untitled Document');
      
      // Initialize editable rows from parsed data
      if (rows.length > 0) {
        const editable = rows.map((row: any) => ({
          question: row.question || '',
          answer: row.answer || '',
          round: row.round || ''
        }));
        setEditableRows(editable);
        
        // Extract round name from first row if present
        if (rows[0]?.round) {
          setRoundName(rows[0].round);
        }
      }
      
      if (rows.length === 0) {
        let errorMsg = 'No data found in document. ';
        if (data.debug) {
          errorMsg += `Debug info: ${data.debug.contentLength} content elements found. `;
          errorMsg += 'Make sure your document contains:\n';
          errorMsg += '• Tables with headers in the first row, OR\n';
          errorMsg += '• Q&A format (Q1: question, A1: answer), OR\n';
          errorMsg += '• Plain paragraphs (will be paired as question/answer)';
        } else {
          errorMsg += 'Make sure it contains tables with headers in the first row or Q&A formatted content.';
        }
        setError(errorMsg);
        setLoading(false);
        return;
      }
      
      // Extract headers from first row
      const firstRow = rows[0];
      const extractedHeaders = Object.keys(firstRow);
      setHeaders(extractedHeaders);
      
      // Auto-detect mappings
      const detectedMappings = detectColumnMappings(extractedHeaders);
      setMappings(detectedMappings);
      
    } catch (err: any) {
      setError(`Error fetching document: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!currentUser) {
      setError('Please log in first');
      return;
    }
    
    // Use editableRows if available, otherwise fall back to parsedData
    const rowsToImport = editableRows.length > 0 ? editableRows : parsedData;
    
    if (rowsToImport.length === 0) {
      setError('No data to import');
      return;
    }
    
    setImporting(true);
    setProgress({ current: 0, total: rowsToImport.length, imported: 0, errors: 0 });
    setError(null);
    
    let imported = 0;
    let errors = 0;
    
    for (let i = 0; i < rowsToImport.length; i++) {
      const row = rowsToImport[i];
      setProgress({ current: i + 1, total: rowsToImport.length, imported, errors });
      
      try {
        const metadata: any = {};
        
        // If using editableRows, use direct mapping
        if (editableRows.length > 0 && 'question' in row && 'answer' in row) {
          metadata.question = row.question;
          metadata.description = row.question;
          metadata.answer = row.answer;
          if (roundName) {
            metadata.round = roundName;
          } else if (row.round) {
            metadata.round = row.round;
          }
        } else {
          // Otherwise use column mappings (original logic)
          mappings.forEach(mapping => {
            if (mapping.targetField === 'skip') return;
            
            const value = (row as any)[mapping.sourceColumn];
            if (value === undefined || value === null || String(value).trim() === '') return;
            
            const strValue = String(value).trim();
            
            switch (mapping.targetField) {
              case 'question':
              case 'description':
                metadata.question = strValue;
                metadata.description = strValue;
                break;
              case 'answer':
                metadata.answer = strValue;
                break;
            case 'alternateAnswers':
              const alternateAnswers = strValue.split(',').map(a => a.trim()).filter(Boolean);
              metadata.alternateAnswers = alternateAnswers;
              break;
            case 'topics':
              const topics = strValue.split(',').map(t => t.trim()).filter(Boolean);
              metadata.topics = topics;
              break;
            case 'options':
              const options = strValue.split(';').map(o => o.trim()).filter(Boolean);
              metadata.options = options;
              break;
            case 'date':
              metadata.date = strValue;
              break;
            case 'round':
              metadata.round = strValue;
              break;
            case 'set':
              metadata.set = strValue;
              break;
            case 'explanation':
              metadata.explanation = strValue;
              break;
            case 'notes':
              metadata.notes = strValue;
              break;
            case 'source':
              metadata.source = strValue;
              break;
            case 'media':
              metadata.media = strValue;
              break;
            case 'types':
              const types = strValue.split(',').map(t => t.trim()).filter(Boolean);
              metadata.types = types;
              break;
          }
        });
        }
        
        // Ensure required fields
        if (!metadata.question) {
          throw new Error(`Row ${i + 1}: Missing required field "question"`);
        }
        if (!metadata.creator) {
          metadata.creator = currentUser;
        }
        
        // Remove correct answer from options if present
        if (metadata.answer && metadata.options) {
          metadata.options = metadata.options.filter((opt: string) => 
            opt.toLowerCase() !== metadata.answer.toLowerCase()
          );
        }
        
        const formData = new FormData();
        formData.append('metadata', JSON.stringify(metadata));
        
        const response = await fetch('/api/submit', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`Failed to import row ${i + 1}`);
        }
        
        imported++;
      } catch (err: any) {
        console.error(`Error importing row ${i + 1}:`, err);
        errors++;
      }
    }
    
    setProgress({ current: rowsToImport.length, total: rowsToImport.length, imported, errors });
    setImporting(false);
    
    if (errors === 0) {
      alert(`Successfully imported ${imported} questions!`);
      router.push('/');
    } else {
      alert(`Imported ${imported} questions with ${errors} errors.`);
    }
  };

  if (!currentUser) {
    return (
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <Navigation />
        <div style={{ marginTop: '20px', padding: '20px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px' }}>
          <p>Please log in first to import from Google Docs.</p>
          <button onClick={() => router.push('/login')} style={{ marginTop: '10px', padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <Navigation />
      
      <h1 style={{ marginTop: '20px' }}>Import from Google Docs</h1>
      
      {error && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '4px', color: '#721c24' }}>
          {error}
        </div>
      )}
      
      <div style={{ marginTop: '20px', padding: '20px', background: '#f8f9fa', borderRadius: '4px' }}>
        <h2 style={{ marginTop: '0' }}>Step 1: Authenticate with Google</h2>
        {!accessToken ? (
          <div>
            <p>Click the button below to authenticate with Google and grant access to your Google Docs.</p>
            <button
              onClick={handleAuthenticate}
              style={{
                marginTop: '10px',
                padding: '12px 24px',
                background: '#4285f4',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Sign in with Google
            </button>
          </div>
        ) : (
          <div style={{ padding: '10px', background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '4px', color: '#155724' }}>
            ✓ Authenticated with Google
          </div>
        )}
      </div>
      
      {accessToken && (
        <div style={{ marginTop: '20px', padding: '20px', background: '#f8f9fa', borderRadius: '4px' }}>
          <h2 style={{ marginTop: '0' }}>Step 2: Enter Google Docs URL or Document ID</h2>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
            Paste the full Google Docs URL or just the document ID. The document should contain tables with headers in the first row.
          </p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <input
              type="text"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              placeholder="https://docs.google.com/document/d/DOCUMENT_ID/edit or DOCUMENT_ID"
              style={{
                flex: 1,
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px'
              }}
            />
            <button
              onClick={handleFetchDocument}
              disabled={loading}
              style={{
                padding: '10px 24px',
                background: loading ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Loading...' : 'Fetch Document'}
            </button>
          </div>
        </div>
      )}
      
      {headers.length > 0 && mappings.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h2>Step 3: Map Columns to Fields</h2>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            Review and adjust how columns are mapped to fields. Fields marked with ⭐ are required.
          </p>
          
          <div style={{
            background: '#fff',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Source Column</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Map To</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((mapping, idx) => {
                  const fieldDef = FIELD_DEFINITIONS.find(f => f.value === mapping.targetField);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '12px' }}>{mapping.sourceColumn}</td>
                      <td style={{ padding: '12px' }}>
                        <select
                          value={mapping.targetField}
                          onChange={(e) => updateMapping(mapping.sourceColumn, e.target.value)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                            width: '100%',
                            maxWidth: '300px'
                          }}
                        >
                          {FIELD_DEFINITIONS.map(field => (
                            <option key={field.value} value={field.value}>
                              {field.label} {field.required ? '⭐' : ''}
                            </option>
                          ))}
                        </select>
                        {fieldDef && (
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                            {fieldDef.description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {mapping.confidence > 0 ? (
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: mapping.confidence > 70 ? '#d4edda' : '#fff3cd',
                            color: mapping.confidence > 70 ? '#155724' : '#856404',
                            fontSize: '12px'
                          }}>
                            {mapping.confidence.toFixed(0)}%
                          </span>
                        ) : (
                          <span style={{ color: '#999' }}>Manual</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {previewRows.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h2>Step 4: Preview Data</h2>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            Preview of first 5 rows with mapped data:
          </p>
          
          <div style={{ maxHeight: '400px', overflow: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
                  {Object.keys(previewRows[0].mapped).map(key => (
                    <th key={key} style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600' }}>
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                    {Object.keys(previewRows[0].mapped).map(key => (
                      <td key={key} style={{ padding: '10px', border: '1px solid #dee2e6', fontSize: '14px' }}>
                        {String(row.mapped[key] || '').substring(0, 100)}
                        {String(row.mapped[key] || '').length > 100 ? '...' : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {editableRows.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h2>Step 4.5: Review & Edit Questions</h2>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            Review and edit the parsed questions. You can add, remove, or modify any question/answer pairs.
          </p>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Round Name (optional):
            </label>
            <input
              type="text"
              value={roundName}
              onChange={(e) => setRoundName(e.target.value)}
              placeholder="e.g., Newspaper Comic Strips"
              style={{
                width: '100%',
                maxWidth: '400px',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px'
              }}
            />
          </div>
          
          <div style={{
            background: '#fff',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            overflow: 'hidden',
            maxHeight: '600px',
            overflowY: 'auto'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', width: '5%' }}>#</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', width: '45%' }}>Question</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', width: '45%' }}>Answer</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', width: '5%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {editableRows.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px', color: '#666' }}>{idx + 1}</td>
                    <td style={{ padding: '12px' }}>
                      <textarea
                        value={row.question}
                        onChange={(e) => {
                          const updated = [...editableRows];
                          updated[idx].question = e.target.value;
                          setEditableRows(updated);
                        }}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                          minHeight: '60px',
                          resize: 'vertical'
                        }}
                        placeholder="Enter question..."
                      />
                    </td>
                    <td style={{ padding: '12px' }}>
                      <textarea
                        value={row.answer}
                        onChange={(e) => {
                          const updated = [...editableRows];
                          updated[idx].answer = e.target.value;
                          setEditableRows(updated);
                        }}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                          minHeight: '60px',
                          resize: 'vertical'
                        }}
                        placeholder="Enter answer..."
                      />
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button
                        onClick={() => {
                          const updated = editableRows.filter((_, i) => i !== idx);
                          setEditableRows(updated);
                        }}
                        style={{
                          padding: '6px 12px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div style={{ marginTop: '15px' }}>
            <button
              onClick={() => {
                setEditableRows([...editableRows, { question: '', answer: '', round: roundName }]);
              }}
              style={{
                padding: '8px 16px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              + Add Question
            </button>
          </div>
        </div>
      )}
      
      {(editableRows.length > 0 || parsedData.length > 0) && mappings.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h2>Step 5: Import</h2>
          
          {progress && (
            <div style={{ marginTop: '15px', padding: '15px', background: '#e7f3ff', border: '1px solid #b3d9ff', borderRadius: '4px' }}>
              <div style={{ marginBottom: '10px' }}>
                <strong>Import Progress:</strong> {progress.current} / {progress.total}
              </div>
              <div style={{ width: '100%', height: '20px', background: '#ddd', borderRadius: '10px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${(progress.current / progress.total) * 100}%`,
                    height: '100%',
                    background: '#28a745',
                    transition: 'width 0.3s'
                  }}
                />
              </div>
              <div style={{ marginTop: '10px', fontSize: '14px' }}>
                Imported: {progress.imported} | Errors: {progress.errors}
              </div>
            </div>
          )}
          
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            Ready to import {(editableRows.length > 0 ? editableRows : parsedData).length} questions from "{documentTitle}".
          </p>
          
          <button
            onClick={handleImport}
            disabled={importing}
            style={{
              padding: '12px 24px',
              background: importing ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: importing ? 'not-allowed' : 'pointer',
              fontWeight: '600'
            }}
          >
            {importing ? 'Importing...' : `Import ${(editableRows.length > 0 ? editableRows : parsedData).length} Questions`}
          </button>
        </div>
      )}
    </div>
  );
}

export default function GoogleDocsImportPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <Navigation />
        <div style={{ marginTop: '20px', padding: '20px', textAlign: 'center' }}>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <GoogleDocsImportPageContent />
    </Suspense>
  );
}
