'use client';

import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useUser } from '../contexts/UserContext';
import Navigation from '../components/Navigation';

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  confidence: number; // 0-100, how confident we are in this mapping
}

interface PreviewRow {
  id: number;
  data: Record<string, any>;
  mapped: Record<string, any>;
  errors: string[];
  warnings: string[];
}

interface ImportProgress {
  current: number;
  total: number;
  imported: number;
  errors: number;
  warnings: number;
}

// Field definitions with detection patterns
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
    value: 'skip',
    label: 'Skip',
    required: false,
    description: 'Ignore this column',
    patterns: []
  }
];

// Auto-detect column mappings based on header names
function detectColumnMappings(headers: string[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = [];
  const usedFields = new Set<string>();
  
  headers.forEach(header => {
    const headerLower = header.toLowerCase().trim();
    let bestMatch: { field: string; confidence: number } | null = null;
    
    // Check each field definition for matches
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
      // Check for multiple choice options (A, B, C, D or Option 1, Option 2)
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

export default function ImportPage() {
  const { currentUser } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [results, setResults] = useState<{ imported: number; errors: string[]; warnings: string[] } | null>(null);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!currentUser) {
      alert('Please log in first.');
      return;
    }

    setFile(selectedFile);
    setPreviewRows([]);
    setResults(null);
    setProgress(null);

    const fileName = selectedFile.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCsv = fileName.endsWith('.csv');

    try {
      let parsedData: any[] = [];
      let fileHeaders: string[] = [];

      if (isExcel) {
        const workbook = XLSX.read(await selectedFile.arrayBuffer(), { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        if (jsonData.length === 0) {
          alert('Excel file appears to be empty.');
          return;
        }
        
        fileHeaders = (jsonData[0] as string[]).map(h => String(h || '').trim());
        const rows = (jsonData.slice(1) as any[]).filter((row: any) => Array.isArray(row) && row.some((cell: any) => cell !== null && cell !== undefined && String(cell).trim() !== '')) as any[][];
        
        parsedData = rows.map((row: any[], idx: number) => {
          const obj: Record<string, any> = {};
          fileHeaders.forEach((header, colIdx) => {
            obj[header] = row[colIdx] !== undefined ? row[colIdx] : '';
          });
          return obj;
        });
      } else if (isCsv) {
        const text = await selectedFile.text();
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        
        if (parsed.errors.length > 0) {
          console.warn('CSV parsing errors:', parsed.errors);
        }
        
        fileHeaders = parsed.meta.fields || [];
        parsedData = parsed.data as any[];
      } else {
        alert('Please select a CSV or Excel file.');
        return;
      }

      if (fileHeaders.length === 0) {
        alert('Could not detect column headers in file.');
        return;
      }

      setHeaders(fileHeaders);
      
      // Auto-detect mappings
      const detectedMappings = detectColumnMappings(fileHeaders);
      
      // Remove any creator mappings - creator is always auto-filled from logged-in user
      const cleanedMappings = detectedMappings.map(m => 
        m.targetField === 'creator' ? { ...m, targetField: 'skip', confidence: 0 } : m
      );
      
      setMappings(cleanedMappings);
      
      // Create preview rows (first 5)
      const preview = parsedData.slice(0, 5).map((row, idx) => {
        const mapped: Record<string, any> = {};
        const errors: string[] = [];
        const warnings: string[] = [];
        
        detectedMappings.forEach(mapping => {
          if (mapping.targetField === 'skip') return;
          
          const value = row[mapping.sourceColumn];
          if (value !== undefined && value !== null && String(value).trim()) {
            mapped[mapping.targetField] = value;
          }
        });
        
        // Validate required fields
        if (!mapped.question && !mapped.description) {
          errors.push('Missing required field: Question');
        }
        if (!mapped.creator) {
          warnings.push('Missing creator - will use logged-in user');
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
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Error parsing file. Please check the file format.');
    }
  }, [currentUser]);

  const updateMapping = (sourceColumn: string, targetField: string) => {
    setMappings(prev => {
      const updated = prev.map(m => 
        m.sourceColumn === sourceColumn ? { ...m, targetField, confidence: targetField === 'skip' ? 0 : 100 } : m
      );
      
      // Update preview with new mappings without re-running detection
      if (file && previewRows.length > 0) {
        const fileName = file.name.toLowerCase();
        const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
        
        // Re-parse file to get fresh data
        file.arrayBuffer().then(buffer => {
          let parsedData: any[] = [];
          
          if (isExcel) {
            const workbook = XLSX.read(buffer, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            const fileHeaders = (jsonData[0] as string[]).map(h => String(h || '').trim());
            const rows = (jsonData.slice(1) as any[]).filter((row: any) => Array.isArray(row) && row.some((cell: any) => cell !== null && cell !== undefined && String(cell).trim() !== '')) as any[][];
            
            parsedData = rows.map((row: any[], idx: number) => {
              const obj: Record<string, any> = {};
              fileHeaders.forEach((header, colIdx) => {
                obj[header] = row[colIdx] !== undefined ? row[colIdx] : '';
              });
              return obj;
            });
          } else {
            file.text().then(text => {
              const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
              parsedData = parsed.data as any[];
              
              updatePreview(parsedData, updated);
            });
            return;
          }
          
          updatePreview(parsedData, updated);
        });
      }
      
      return updated;
    });
  };
  
  const updatePreview = (parsedData: any[], currentMappings: ColumnMapping[]) => {
    const preview = parsedData.slice(0, 5).map((row, idx) => {
      const mapped: Record<string, any> = {};
      const errors: string[] = [];
      const warnings: string[] = [];
      
      currentMappings.forEach(mapping => {
        if (mapping.targetField === 'skip') return;
        
        const value = row[mapping.sourceColumn];
        if (value !== undefined && value !== null && String(value).trim()) {
          mapped[mapping.targetField] = value;
        }
      });
      
      // Validate required fields
      if (!mapped.question && !mapped.description) {
        errors.push('Missing required field: Question');
      }
      if (!mapped.creator) {
        warnings.push('Missing creator - will use logged-in user');
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
  };

  const processImport = async () => {
    if (!file || !currentUser) return;
    
    setImporting(true);
    setProgress({ current: 0, total: 0, imported: 0, errors: 0, warnings: 0 });
    
    try {
      // Re-parse file
      const fileName = file.name.toLowerCase();
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      
      let parsedData: any[] = [];
      
      if (isExcel) {
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        const fileHeaders = (jsonData[0] as string[]).map(h => String(h || '').trim());
        const rows = (jsonData.slice(1) as any[]).filter((row: any) => Array.isArray(row) && row.some((cell: any) => cell !== null && cell !== undefined && String(cell).trim() !== '')) as any[][];
        
        parsedData = rows.map((row: any[]) => {
          const obj: Record<string, any> = {};
          fileHeaders.forEach((header, colIdx) => {
            obj[header] = row[colIdx] !== undefined ? row[colIdx] : '';
          });
          return obj;
        });
      } else {
        const text = await file.text();
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        parsedData = parsed.data as any[];
      }
      
      setProgress(prev => prev ? { ...prev, total: parsedData.length } : null);
      
      const errors: string[] = [];
      const warnings: string[] = [];
      let imported = 0;
      
      // Process each row
      for (let i = 0; i < parsedData.length; i++) {
        const row = parsedData[i];
        setProgress(prev => prev ? { ...prev, current: i + 1 } : null);
        
        try {
          const metadata: any = {};
          
          // Map columns to fields
          mappings.forEach(mapping => {
            if (mapping.targetField === 'skip') return;
            
            const value = row[mapping.sourceColumn];
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
              // Creator is always set from logged-in user, never mapped from columns
              case 'topics':
                const topics = strValue.split(',').map(t => t.trim()).filter(Boolean);
                metadata.topics = topics;
                break;
              case 'options':
                // Semicolon-delimited incorrect options
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
            }
          });
          
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
          
          // Submit to API (using FormData format that submit API expects)
          const formData = new FormData();
          formData.append('metadata', JSON.stringify(metadata));
          
          const response = await fetch('/api/submit', {
            method: 'POST',
            body: formData
          });
          
          const result = await response.json();
          if (result.success) {
            imported++;
          } else {
            errors.push(`Row ${i + 1}: ${result.error || 'Unknown error'}`);
          }
        } catch (error) {
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        setProgress(prev => prev ? { ...prev, imported, errors: errors.length } : null);
      }
      
      setResults({ imported, errors, warnings });
      setImporting(false);
    } catch (error) {
      console.error('Import error:', error);
      alert('Error during import. Please try again.');
      setImporting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      <Navigation />
      
      <h1 style={{ marginTop: '30px', marginBottom: '20px' }}>Import Questions</h1>
      
      {!file ? (
        <div
          onDrop={(e) => {
            e.preventDefault();
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile) handleFileSelect(droppedFile);
          }}
          onDragOver={(e) => e.preventDefault()}
          style={{
            border: '3px dashed #0066cc',
            borderRadius: '12px',
            padding: '60px',
            textAlign: 'center',
            background: '#f0f7ff',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📁</div>
          <h2 style={{ marginBottom: '10px', color: '#0066cc' }}>Drop your file here</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>or click to browse</p>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
            style={{ display: 'none' }}
            id="file-input"
          />
          <label
            htmlFor="file-input"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: '#0066cc',
              color: '#fff',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Choose File
          </label>
          <p style={{ marginTop: '20px', fontSize: '14px', color: '#999' }}>
            Supports CSV and Excel files (.csv, .xlsx, .xls)
          </p>
        </div>
      ) : (
        <div>
          {/* File Info */}
          <div style={{
            background: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <strong>{file.name}</strong>
              <span style={{ marginLeft: '10px', color: '#666' }}>
                ({headers.length} columns, {previewRows.length > 0 ? '~' : ''} rows)
              </span>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setHeaders([]);
                setPreviewRows([]);
                setMappings([]);
                setResults(null);
              }}
              style={{
                padding: '6px 12px',
                background: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Change File
            </button>
          </div>

          {/* Column Mapping */}
          {mappings.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ marginBottom: '15px' }}>Column Mapping</h2>
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

          {/* Preview */}
          {previewRows.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ marginBottom: '15px' }}>Preview</h2>
              <p style={{ color: '#666', marginBottom: '15px' }}>
                Preview of how your data will be imported (showing first {previewRows.length} rows):
              </p>
              
              <div style={{
                background: '#fff',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                overflowX: 'auto'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Row</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Question</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Answer</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '10px' }}>{row.id}</td>
                        <td style={{ padding: '10px' }}>
                          {row.mapped.question || row.mapped.description || (
                            <span style={{ color: '#dc3545' }}>Missing</span>
                          )}
                        </td>
                        <td style={{ padding: '10px' }}>
                          {row.mapped.answer || <span style={{ color: '#999' }}>—</span>}
                        </td>
                        <td style={{ padding: '10px' }}>
                          {row.errors.length > 0 ? (
                            <span style={{ color: '#dc3545' }}>❌ {row.errors[0]}</span>
                          ) : row.warnings.length > 0 ? (
                            <span style={{ color: '#ffc107' }}>⚠️ {row.warnings[0]}</span>
                          ) : (
                            <span style={{ color: '#28a745' }}>✅ OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Progress */}
          {importing && progress && (
            <div style={{
              background: '#e7f3ff',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h3 style={{ marginBottom: '10px' }}>Importing...</h3>
              <div style={{ marginBottom: '10px' }}>
                <div style={{
                  width: '100%',
                  height: '24px',
                  background: '#dee2e6',
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(progress.current / progress.total) * 100}%`,
                    height: '100%',
                    background: '#0066cc',
                    transition: 'width 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {progress.current} / {progress.total}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '20px', fontSize: '14px' }}>
                <span>✅ Imported: {progress.imported}</span>
                <span>❌ Errors: {progress.errors}</span>
              </div>
            </div>
          )}

          {/* Results */}
          {results && !importing && (
            <div style={{
              background: results.errors.length > 0 ? '#fff3cd' : '#d4edda',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h3 style={{ marginBottom: '15px' }}>
                {results.errors.length === 0 ? '✅ Import Complete!' : '⚠️ Import Completed with Errors'}
              </h3>
              <div style={{ marginBottom: '10px' }}>
                <strong>Successfully imported:</strong> {results.imported} questions
              </div>
              {results.errors.length > 0 && (
                <div style={{ marginTop: '15px' }}>
                  <strong>Errors ({results.errors.length}):</strong>
                  <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
                    {results.errors.slice(0, 10).map((error, idx) => (
                      <li key={idx} style={{ marginBottom: '5px' }}>{error}</li>
                    ))}
                    {results.errors.length > 10 && (
                      <li>... and {results.errors.length - 10} more errors</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Import Button */}
          {!importing && !results && (
            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              <button
                onClick={processImport}
                disabled={mappings.filter(m => m.targetField === 'question').length === 0}
                style={{
                  padding: '15px 40px',
                  fontSize: '18px',
                  fontWeight: '600',
                  background: mappings.filter(m => m.targetField === 'question').length === 0 ? '#ccc' : '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: mappings.filter(m => m.targetField === 'question').length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                Import Questions
              </button>
              {mappings.filter(m => m.targetField === 'question').length === 0 && (
                <p style={{ marginTop: '10px', color: '#dc3545' }}>
                  Please map at least one column to "Question" to proceed.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
