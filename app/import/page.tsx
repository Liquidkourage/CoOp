'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  message?: string;
  debug?: any;
}

export default function ImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [showDebug, setShowDebug] = useState(false);
  const [trivnowConfig, setTrivnowConfig] = useState<any>(null);
  const [isTrivnowFormat, setIsTrivnowFormat] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setResult(null);
      setPreview([]);
      
      // Check for TrivNow configuration
      const savedConfig = localStorage.getItem('trivnow-config');
      let config = null;
      if (savedConfig) {
        try {
          config = JSON.parse(savedConfig);
          setTrivnowConfig(config);
        } catch (e) {
          console.error('Failed to parse TrivNow config:', e);
        }
      }
      
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            setPreview(results.data.slice(0, 5) as any[]);
            const headers = Object.keys(results.data[0] as any);
            
            // Check if this looks like TrivNow format
            const headerLower = headers.map(h => h.toLowerCase().trim());
            const isTrivnow = config && config.detectionPatterns && 
              config.detectionPatterns.some((pattern: string) => 
                headerLower.includes(pattern.toLowerCase().trim())
              );
            setIsTrivnowFormat(!!isTrivnow);
            
            // Use TrivNow mapping if detected, otherwise use default mapping
            const mapping: Record<string, string> = isTrivnow && config.columnMapping 
              ? { ...config.columnMapping }
              : {};
            
            headers.forEach(header => {
              const lower = header.toLowerCase().trim();
              if (lower.includes('title') || lower.includes('name') || lower === 'quiz' || lower === 'set') {
                mapping[header] = 'title';
              } else if (lower.includes('creator') || lower.includes('author') || lower.includes('user') || lower.includes('owner') || lower === 'by') {
                mapping[header] = 'creator';
              } else if (lower.includes('date') || lower.includes('created') || lower.includes('published')) {
                mapping[header] = 'date';
              } else if (lower.includes('topic') || lower.includes('category') || lower.includes('subject') || lower.includes('tag')) {
                mapping[header] = 'topics';
              } else if (lower.includes('format') || (lower.includes('type') && !lower.includes('question'))) {
                mapping[header] = 'format';
              } else if ((lower.includes('question') && lower.includes('count')) || lower.includes('questions') || lower === 'count') {
                mapping[header] = 'questionCount';
              } else if (lower.includes('difficulty') || lower.includes('level') || lower.includes('difficult')) {
                mapping[header] = 'difficulty';
              } else if (lower.includes('description') || lower.includes('desc') || lower.includes('notes')) {
                mapping[header] = 'description';
              } else if (lower.includes('question') && lower.includes('type')) {
                mapping[header] = 'types';
              }
            });
            
            // If not TrivNow format, use default auto-mapping
            if (!isTrivnow) {
              headers.forEach(header => {
                const lower = header.toLowerCase().trim();
                if (lower.includes('title') || lower.includes('name') || lower === 'quiz' || lower === 'set') {
                  mapping[header] = 'title';
                } else if (lower.includes('creator') || lower.includes('author') || lower.includes('user') || lower.includes('owner') || lower === 'by') {
                  mapping[header] = 'creator';
                } else if (lower.includes('date') || lower.includes('created') || lower.includes('published')) {
                  mapping[header] = 'date';
                } else if (lower.includes('topic') || lower.includes('category') || lower.includes('subject') || lower.includes('tag')) {
                  mapping[header] = 'topics';
                } else if (lower.includes('format') || (lower.includes('type') && !lower.includes('question'))) {
                  mapping[header] = 'format';
                } else if ((lower.includes('question') && lower.includes('count')) || lower.includes('questions') || lower === 'count') {
                  mapping[header] = 'questionCount';
                } else if (lower.includes('difficulty') || lower.includes('level') || lower.includes('difficult')) {
                  mapping[header] = 'difficulty';
                } else if (lower.includes('description') || lower.includes('desc') || lower.includes('notes')) {
                  mapping[header] = 'description';
                } else if (lower.includes('question') && lower.includes('type')) {
                  mapping[header] = 'types';
                }
              });
            }
            
            setColumnMapping(mapping);
          }
        },
        error: (error) => {
          setResult({
            success: false,
            imported: 0,
            errors: [error.message]
          });
        }
      });
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const rows = results.data as any[];
          const errors: string[] = [];
          let imported = 0;
          const debugInfo: any = {
            totalRows: rows.length,
            firstRow: rows[0],
            columnMapping: columnMapping,
            availableColumns: rows[0] ? Object.keys(rows[0]) : [],
            isTrivnowFormat: isTrivnowFormat,
            groupingFields: trivnowConfig?.groupingFields || []
          };

          // If TrivNow format with grouping fields, group questions by quiz-level fields
          if (isTrivnowFormat && trivnowConfig?.groupingFields && trivnowConfig.groupingFields.length > 0) {
            const groups = new Map<string, any[]>();
            
            // Group rows by grouping fields
            rows.forEach((row, idx) => {
              const groupKey = trivnowConfig.groupingFields
                .map((field: string) => `${field}=${row[field] || ''}`)
                .join('|');
              
              if (!groups.has(groupKey)) {
                groups.set(groupKey, []);
              }
              groups.get(groupKey)!.push({ row, index: idx + 1 });
            });

            debugInfo.groupsFound = groups.size;
            debugInfo.groupSizes = Array.from(groups.values()).map(g => g.length);

            // Process each group as one content item
            for (const [groupKey, questionRows] of groups.entries()) {
              try {
                // Use the first row in the group for quiz-level metadata
                const firstRow = questionRows[0].row;
                const metadata: any = {};
                
                // Map quiz-level fields (all fields except question-specific ones)
                Object.keys(columnMapping).forEach(csvCol => {
                  const mappedField = columnMapping[csvCol];
                  if (!mappedField) return;
                  
                  const value = firstRow[csvCol];
                  
                  if (value !== undefined && value !== null && value.toString().trim()) {
                    if (mappedField === 'topics') {
                      metadata.topics = value.toString().split(',').map((t: string) => t.trim()).filter(Boolean);
                    } else if (mappedField === 'types') {
                      metadata.types = value.toString().split(',').map((t: string) => t.trim()).filter(Boolean);
                    } else {
                      metadata[mappedField] = value.toString().trim();
                    }
                  }
                });

                // Set question count to number of questions in this group
                metadata.questionCount = questionRows.length;

                // Generate title if not mapped
                if (!metadata.title) {
                  const groupingValues = trivnowConfig.groupingFields
                    .map((field: string) => firstRow[field])
                    .filter(Boolean)
                    .join(' - ');
                  metadata.title = groupingValues || `TrivNow Quiz (${questionRows.length} questions)`;
                }

                // Generate creator if not mapped
                if (!metadata.creator) {
                  metadata.creator = firstRow['source'] || 'Unknown';
                }

                if (!metadata.date) {
                  metadata.date = new Date().toISOString().split('T')[0];
                }

                const formData = new FormData();
                formData.append('metadata', JSON.stringify(metadata));

                const response = await fetch('/api/submit', {
                  method: 'POST',
                  body: formData,
                });

                const result = await response.json();

                if (!response.ok) {
                  errors.push(`Group (${questionRows.length} questions): ${result.error || 'Failed to import'}`);
                } else {
                  imported++;
                }
              } catch (error) {
                errors.push(`Group (${questionRows.length} questions): ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            }
          } else {
            // Standard import: one row = one content item
            for (let i = 0; i < rows.length; i++) {
              const row = rows[i];
              try {
                const metadata: any = {};
                
                Object.keys(columnMapping).forEach(csvCol => {
                  const mappedField = columnMapping[csvCol];
                  if (!mappedField) return;
                  
                  const value = row[csvCol];
                  
                  if (value !== undefined && value !== null && value.toString().trim()) {
                    if (mappedField === 'topics') {
                      metadata.topics = value.toString().split(',').map((t: string) => t.trim()).filter(Boolean);
                    } else if (mappedField === 'questionCount') {
                      metadata.questionCount = parseInt(value.toString()) || undefined;
                    } else if (mappedField === 'types') {
                      metadata.types = value.toString().split(',').map((t: string) => t.trim()).filter(Boolean);
                    } else {
                      metadata[mappedField] = value.toString().trim();
                    }
                  }
                });

                if (!metadata.title) {
                  const mappedTitleCol = Object.keys(columnMapping).find(col => columnMapping[col] === 'title');
                  const rowSample = Object.entries(row).slice(0, 3).map(([k, v]) => `${k}="${v}"`).join(', ');
                  errors.push(`Row ${i + 1}: Missing title. Title column mapped to: "${mappedTitleCol || 'none'}". Sample: ${rowSample}`);
                  continue;
                }

                if (!metadata.creator) {
                  errors.push(`Row ${i + 1}: Missing creator (title: ${metadata.title})`);
                  continue;
                }

                if (!metadata.date) {
                  metadata.date = new Date().toISOString().split('T')[0];
                }

                const formData = new FormData();
                formData.append('metadata', JSON.stringify(metadata));

                const response = await fetch('/api/submit', {
                  method: 'POST',
                  body: formData,
                });

                const result = await response.json();

                if (!response.ok) {
                  errors.push(`Row ${i + 1}: ${result.error || 'Failed to import'}`);
                } else {
                  imported++;
                }
              } catch (error) {
                errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            }
          }

          setResult({
            success: imported > 0,
            imported,
            errors,
            message: `Imported ${imported} of ${rows.length} rows`,
            debug: debugInfo
          });
          setImporting(false);
        },
        error: (error) => {
          setResult({
            success: false,
            imported: 0,
            errors: [error.message]
          });
          setImporting(false);
        }
      });
    } catch (error) {
      setResult({
        success: false,
        imported: 0,
        errors: [error instanceof Error ? error.message : 'Failed to parse CSV']
      });
      setImporting(false);
    }
  };

  return (
    <div>
      <header className="header">
        <div className="container">
          <h1>Import CSV</h1>
          <p>Import trivia content from a CSV file</p>
        </div>
      </header>

      <main className="container">
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{
            background: '#fff',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
            <h2 style={{ marginBottom: '20px' }}>CSV Format</h2>
            <p style={{ marginBottom: '15px', color: '#666' }}>
              Your CSV should have columns that can be mapped to our metadata fields:
            </p>
            <div style={{
              background: '#f5f5f5',
              padding: '15px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '14px',
              marginBottom: '20px'
            }}>
              <div><strong>Required:</strong> title, creator</div>
              <div><strong>Optional:</strong> date, topics (comma-separated), format, questionCount, difficulty, types, description</div>
            </div>
            <div style={{
              background: '#e3f2fd',
              padding: '15px',
              borderRadius: '4px',
              marginTop: '15px'
            }}>
              <strong>Example CSV:</strong>
              <pre style={{ marginTop: '10px', fontSize: '12px', overflow: 'auto' }}>
{`title,creator,date,topics,format,questionCount,difficulty
"Science Quiz","John Doe","2024-01-15","science,physics","csv",25,"medium"
"History Trivia","Jane Smith","2024-01-16","history,world-war-ii","xlsx",50,"hard"`}
              </pre>
            </div>
          </div>

          <div style={{
            background: '#fff',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>
                Select CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
              />
            </div>

            {preview.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '15px' }}>Column Mapping</h3>
                {isTrivnowFormat && trivnowConfig?.groupingFields && trivnowConfig.groupingFields.length > 0 && (
                  <div style={{
                    background: '#fff3cd',
                    border: '1px solid #ffc107',
                    padding: '15px',
                    borderRadius: '4px',
                    marginBottom: '15px'
                  }}>
                    <strong>⚙️ TrivNow Format Detected</strong>
                    <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>
                      Questions will be grouped by: <strong>{trivnowConfig.groupingFields.join(', ')}</strong>
                      <br />
                      Each unique combination of these fields will create one content item (quiz) containing all matching questions.
                      The question count will be automatically set to the number of questions in each group.
                    </p>
                  </div>
                )}
                <p style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>
                  Map your CSV columns to our metadata fields. Auto-detected mappings are shown below.
                  {!isTrivnowFormat && (
                    <strong style={{ color: '#c62828', display: 'block', marginTop: '5px' }}>
                      Make sure "Title" and "Creator" columns are mapped!
                    </strong>
                  )}
                </p>
                <div style={{
                  background: '#f9f9f9',
                  padding: '15px',
                  borderRadius: '4px',
                  marginBottom: '15px'
                }}>
                  {Object.keys(preview[0] || {}).map((csvCol) => (
                    <div key={csvCol} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <label style={{ minWidth: '150px', fontWeight: '500' }}>{csvCol}:</label>
                      <select
                        value={columnMapping[csvCol] || ''}
                        onChange={(e) => setColumnMapping({ ...columnMapping, [csvCol]: e.target.value })}
                        style={{
                          flex: 1,
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          background: columnMapping[csvCol] === 'title' || columnMapping[csvCol] === 'creator' ? '#fff3cd' : '#fff'
                        }}
                      >
                        <option value="">-- Skip --</option>
                        <option value="title">Title *</option>
                        <option value="creator">Creator *</option>
                        <option value="date">Date</option>
                        <option value="topics">Topics (comma-separated)</option>
                        <option value="format">Format</option>
                        <option value="questionCount">Question Count</option>
                        <option value="difficulty">Difficulty</option>
                        <option value="types">Types (comma-separated)</option>
                        <option value="description">Description</option>
                      </select>
                    </div>
                  ))}
                </div>

                <h3 style={{ marginBottom: '15px' }}>Preview (first 5 rows)</h3>
                <div style={{
                  overflowX: 'auto',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        {Object.keys(preview[0] || {}).map(col => (
                          <th key={col} style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, idx) => (
                        <tr key={idx}>
                          {Object.values(row).map((cell: any, cellIdx) => (
                            <td key={cellIdx} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                              {String(cell || '').substring(0, 50)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {result && (
              <div style={{
                padding: '15px',
                borderRadius: '4px',
                marginBottom: '20px',
                background: result.success ? '#e8f5e9' : '#ffebee',
                color: result.success ? '#2e7d32' : '#c62828'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '10px' }}>
                  {result.success ? '✓ Import Complete' : '✗ Import Failed'}
                </div>
                <div>{result.message}</div>
                {result.errors.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <strong>Errors:</strong>
                    <button
                      onClick={() => setShowDebug(!showDebug)}
                      style={{
                        marginLeft: '10px',
                        padding: '4px 8px',
                        background: '#666',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      {showDebug ? 'Hide' : 'Show'} Debug Info
                    </button>
                    {showDebug && result.debug && (
                      <pre style={{
                        marginTop: '10px',
                        padding: '10px',
                        background: '#f5f5f5',
                        borderRadius: '4px',
                        fontSize: '12px',
                        overflow: 'auto'
                      }}>
                        {JSON.stringify(result.debug, null, 2)}
                      </pre>
                    )}
                    <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                      {result.errors.slice(0, 10).map((error, idx) => (
                        <li key={idx} style={{ fontSize: '14px' }}>{error}</li>
                      ))}
                      {result.errors.length > 10 && (
                        <li style={{ fontSize: '14px' }}>... and {result.errors.length - 10} more errors</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
              <button
                onClick={handleImport}
                disabled={!file || importing || preview.length === 0}
                style={{
                  padding: '12px 24px',
                  background: (!file || importing || preview.length === 0) ? '#ccc' : '#0066cc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  cursor: (!file || importing || preview.length === 0) ? 'not-allowed' : 'pointer',
                  flex: 1
                }}
              >
                {importing ? 'Importing...' : 'Import CSV'}
              </button>
              <button
                onClick={() => router.push('/')}
                style={{
                  padding: '12px 24px',
                  background: '#666',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
