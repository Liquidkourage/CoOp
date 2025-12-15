'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

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
  const [excelConfig, setExcelConfig] = useState<any>(null);
  const [isTrivnowFormat, setIsTrivnowFormat] = useState(false);
  const [isExcelFormat, setIsExcelFormat] = useState(false);
  const [fileType, setFileType] = useState<'csv' | 'excel' | null>(null);
  const [defaultCreator, setDefaultCreator] = useState<string>('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setResult(null);
      setPreview([]);
      
      // Detect file type
      const fileName = selectedFile.name.toLowerCase();
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      const isCsv = fileName.endsWith('.csv');
      setFileType(isExcel ? 'excel' : isCsv ? 'csv' : null);
      
      // Check for configurations
      const savedTrivnowConfig = localStorage.getItem('trivnow-config');
      const savedExcelConfig = localStorage.getItem('excel-config');
      
      let trivnowConfig = null;
      let excelConfig = null;
      
      if (savedTrivnowConfig) {
        try {
          trivnowConfig = JSON.parse(savedTrivnowConfig);
          setTrivnowConfig(trivnowConfig);
        } catch (e) {
          console.error('Failed to parse TrivNow config:', e);
        }
      }
      
      if (savedExcelConfig) {
        try {
          excelConfig = JSON.parse(savedExcelConfig);
          setExcelConfig(excelConfig);
        } catch (e) {
          console.error('Failed to parse Excel config:', e);
        }
      }
      
      if (isExcel) {
        // Handle Excel file
        try {
          const arrayBuffer = await selectedFile.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const firstSheetName = excelConfig?.sheetName || workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length > 0) {
            const headers = (jsonData[0] as any[]).map(h => String(h || '').trim()).filter(Boolean);
            const rows = jsonData.slice(1).map((row: any) => {
              const obj: any = {};
              headers.forEach((header, idx) => {
                obj[header] = row[idx] !== undefined ? row[idx] : '';
              });
              return obj;
            }).filter((row: any) => Object.values(row).some((v: any) => v !== ''));
            
            setPreview(rows.slice(0, 5));
            
            // Check if this looks like configured Excel format
            const headerLower = headers.map(h => h.toLowerCase().trim());
            const isExcelFormat = excelConfig && excelConfig.detectionPatterns && 
              excelConfig.detectionPatterns.some((pattern: string) => 
                headerLower.includes(pattern.toLowerCase().trim())
              );
            setIsExcelFormat(!!isExcelFormat);
            
            // Start with Excel config mapping if available, otherwise empty
            const mapping: Record<string, string> = isExcelFormat && excelConfig.columnMapping 
              ? { ...excelConfig.columnMapping }
              : {};
            
              // Auto-map fields
              headers.forEach(header => {
                if (mapping[header]) return;
                
                const lower = header.toLowerCase().trim();
                // Check exact matches first
                if (lower === 'question' || lower === 'questions') {
                  // Map Question column to description (will be used for title generation)
                  mapping[header] = 'description';
                } else if (lower === 'category') {
                  // Category is often a round/category name, map to description (can be changed by user)
                  mapping[header] = 'description';
                } else if (lower === 'type') {
                  // "Type" column is usually question type, not file format
                  mapping[header] = 'types';
                } else if (lower.includes('title') || lower.includes('name') || lower === 'quiz' || lower === 'set') {
                  mapping[header] = 'title';
                } else if (lower.includes('creator') || lower.includes('author') || lower.includes('user') || lower.includes('owner') || lower === 'by') {
                  mapping[header] = 'creator';
                } else if (lower.includes('date') || lower.includes('created') || lower.includes('published')) {
                  mapping[header] = 'date';
                } else if (lower.includes('topic') || lower.includes('subject') || lower.includes('tag')) {
                  // Don't auto-map "category" here - it's handled above
                  mapping[header] = 'topics';
                } else if (lower.includes('format') || (lower.includes('file') && lower.includes('format'))) {
                  // Only map to format if it explicitly says "format" or "file format"
                  mapping[header] = 'format';
                } else if ((lower.includes('question') && lower.includes('count')) || lower === 'count') {
                  mapping[header] = 'questionCount';
                } else if (lower.includes('difficulty') || lower.includes('level') || lower.includes('difficult')) {
                  mapping[header] = 'difficulty';
                } else if (lower.includes('description') || lower.includes('desc') || lower.includes('notes')) {
                  mapping[header] = 'description';
                } else if (lower.includes('question') && lower.includes('type')) {
                  mapping[header] = 'types';
                } else if (lower === 'correctanswer' || lower === 'correct_answer' || (lower.includes('correct') && lower.includes('answer'))) {
                  mapping[header] = 'answer';
                }
              });
            
            setColumnMapping(mapping);
          }
        } catch (error) {
          setResult({
            success: false,
            imported: 0,
            errors: [error instanceof Error ? error.message : 'Failed to read Excel file']
          });
        }
      } else {
        // Handle CSV file
        Papa.parse(selectedFile, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              setPreview(results.data.slice(0, 5) as any[]);
              const headers = Object.keys(results.data[0] as any);
              
              // Check if this looks like TrivNow format
              const headerLower = headers.map(h => h.toLowerCase().trim());
              const isTrivnow = trivnowConfig && trivnowConfig.detectionPatterns && 
                trivnowConfig.detectionPatterns.some((pattern: string) => 
                  headerLower.includes(pattern.toLowerCase().trim())
                );
              setIsTrivnowFormat(!!isTrivnow);
              
              // Start with TrivNow config mapping if available, otherwise empty
              const mapping: Record<string, string> = isTrivnow && trivnowConfig.columnMapping 
                ? { ...trivnowConfig.columnMapping }
                : {};
              
              // Auto-map fields that aren't already mapped (for both TrivNow and regular CSVs)
              headers.forEach(header => {
                // Skip if already mapped (preserves TrivNow config mappings)
                if (mapping[header]) return;
                
                const lower = header.toLowerCase().trim();
                // Check exact matches first
                if (lower === 'question' || lower === 'questions') {
                  // Map Question column to description (will be used for title generation)
                  mapping[header] = 'description';
                } else if (lower === 'category') {
                  // Category is often a round/category name, map to description (can be changed by user)
                  mapping[header] = 'description';
                } else if (lower === 'type') {
                  // "Type" column is usually question type, not file format
                  mapping[header] = 'types';
                } else if (lower.includes('title') || lower.includes('name') || lower === 'quiz' || lower === 'set') {
                  mapping[header] = 'title';
                } else if (lower.includes('creator') || lower.includes('author') || lower.includes('user') || lower.includes('owner') || lower === 'by') {
                  mapping[header] = 'creator';
                } else if (lower.includes('date') || lower.includes('created') || lower.includes('published')) {
                  mapping[header] = 'date';
                } else if (lower.includes('topic') || lower.includes('subject') || lower.includes('tag')) {
                  // Don't auto-map "category" here - it's handled above
                  mapping[header] = 'topics';
                } else if (lower.includes('format') || (lower.includes('file') && lower.includes('format'))) {
                  // Only map to format if it explicitly says "format" or "file format"
                  mapping[header] = 'format';
                } else if ((lower.includes('question') && lower.includes('count')) || lower === 'count') {
                  mapping[header] = 'questionCount';
                } else if (lower.includes('difficulty') || lower.includes('level') || lower.includes('difficult')) {
                  mapping[header] = 'difficulty';
                } else if (lower.includes('description') || lower.includes('desc') || lower.includes('notes')) {
                  mapping[header] = 'description';
                } else if (lower.includes('question') && lower.includes('type')) {
                  mapping[header] = 'types';
                } else if (lower === 'correctanswer' || lower === 'correct_answer' || (lower.includes('correct') && lower.includes('answer'))) {
                  mapping[header] = 'answer';
                }
              });
              
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
    }
  };

  const processRows = async (rows: any[]) => {
    const errors: string[] = [];
    let imported = 0;
    const debugInfo: any = {
      totalRows: rows.length,
      firstRow: rows[0],
      columnMapping: columnMapping,
      availableColumns: rows[0] ? Object.keys(rows[0]) : [],
      isTrivnowFormat: isTrivnowFormat,
      isExcelFormat: isExcelFormat,
      fileType: fileType
    };

    // Import each row as a separate content item (one row = one content item)
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const metadata: any = {};
        
        // First pass: collect all values for each mapped field
        const fieldValues: Record<string, string[]> = {};
        
        Object.keys(columnMapping).forEach(col => {
          const mappedField = columnMapping[col];
          if (!mappedField) return;
          
          const value = row[col];
          
          if (value !== undefined && value !== null && value.toString().trim()) {
            if (!fieldValues[mappedField]) {
              fieldValues[mappedField] = [];
            }
            fieldValues[mappedField].push(value.toString().trim());
          }
        });
        
        // Process collected values
        Object.keys(fieldValues).forEach(mappedField => {
          const values = fieldValues[mappedField];
          
          if (mappedField === 'topics') {
            // Combine all topic values and split by comma
            const allTopics = values.join(',').split(',').map((t: string) => t.trim()).filter(Boolean);
            metadata.topics = [...new Set(allTopics)]; // Remove duplicates
          } else if (mappedField === 'questionCount') {
            // Use the first valid number
            const num = parseInt(values[0]) || undefined;
            if (num) metadata.questionCount = num;
          } else if (mappedField === 'types') {
            // Combine all type values and split by comma
            const allTypes = values.join(',').split(',').map((t: string) => t.trim()).filter(Boolean);
            metadata.types = [...new Set(allTypes)]; // Remove duplicates
          } else if (mappedField === 'description') {
            // Concatenate multiple description fields with line breaks
            metadata.description = values.join('\n\n');
          } else if (mappedField === 'creator') {
            // Use first non-empty creator value
            metadata.creator = values.find(v => v) || '';
          } else if (mappedField === 'answer') {
            // Store answer in both answer and correctAnswer fields
            const answerValue = values[0];
            metadata.answer = answerValue;
            metadata.correctAnswer = answerValue;
          } else {
            // For other fields, use the first value (or concatenate if it makes sense)
            metadata[mappedField] = values[0];
          }
        });

        // Generate title from question if not mapped
        if (!metadata.title) {
          // Try to find a question column (case-insensitive)
          const questionKey = Object.keys(row).find(key => 
            key.toLowerCase() === 'question' || key.toLowerCase() === 'questions'
          );
          
          if (questionKey && row[questionKey]) {
            // Use first part of question as title
            const questionText = row[questionKey].toString().trim();
            if (questionText) {
              metadata.title = questionText.substring(0, 100) + (questionText.length > 100 ? '...' : '');
            }
          }
          
          // If still no title, try to use description if available
          if (!metadata.title && metadata.description) {
            metadata.title = metadata.description.substring(0, 100) + (metadata.description.length > 100 ? '...' : '');
          }
          
          // Title is optional - if still no title, use description or question text as fallback
          if (!metadata.title) {
            if (metadata.description) {
              // Use description as title (truncated)
              metadata.title = metadata.description.substring(0, 100) + (metadata.description.length > 100 ? '...' : '');
            } else {
              // Last resort: use first available text field
              const firstTextValue = Object.values(row).find(v => v && v.toString().trim());
              if (firstTextValue) {
                metadata.title = firstTextValue.toString().trim().substring(0, 100);
              } else {
                metadata.title = 'Untitled Question';
              }
            }
          }
        }

        // Use default creator if no creator is mapped
        if (!metadata.creator) {
          if (defaultCreator.trim()) {
            metadata.creator = defaultCreator.trim();
          } else if ((isTrivnowFormat || isExcelFormat) && row['source']) {
            metadata.creator = row['source'].toString();
          } else {
            errors.push(`Row ${i + 1}: Missing creator (title: ${metadata.title}). Please set a default creator above.`);
            continue;
          }
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

    return { imported, errors, debugInfo };
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      if (fileType === 'excel') {
        // Handle Excel file
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = excelConfig?.sheetName || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 0) {
          const headers = (jsonData[0] as any[]).map(h => String(h || '').trim()).filter(Boolean);
          const rows = jsonData.slice(1).map((row: any) => {
            const obj: any = {};
            headers.forEach((header, idx) => {
              obj[header] = row[idx] !== undefined ? row[idx] : '';
            });
            return obj;
          }).filter((row: any) => Object.values(row).some((v: any) => v !== ''));
          
          const { imported, errors, debugInfo } = await processRows(rows);
          
          setResult({
            success: imported > 0,
            imported,
            errors,
            message: `Imported ${imported} of ${rows.length} rows`,
            debug: debugInfo
          });
          setImporting(false);
        } else {
          setResult({
            success: false,
            imported: 0,
            errors: ['Excel file appears to be empty']
          });
          setImporting(false);
        }
      } else {
        // Handle CSV file
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            const rows = results.data as any[];
            const { imported, errors, debugInfo } = await processRows(rows);
            
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
      }
    } catch (error) {
      setResult({
        success: false,
        imported: 0,
        errors: [error instanceof Error ? error.message : 'Failed to parse file']
      });
      setImporting(false);
    }
  };

  return (
    <div>
      <header className="header">
        <div className="container">
          <h1>Import CSV/Excel</h1>
          <p>Import trivia content from a CSV or Excel (.xlsx) file</p>
          <nav style={{ marginTop: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <Link href="/" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>Home</Link>
            <Link href="/submit" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>Submit Content</Link>
            <Link href="/import" style={{ color: '#ff6600', textDecoration: 'none', fontWeight: '600' }}>Import CSV/Excel</Link>
            <Link href="/configure-trivnow" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>⚙️ Configure TrivNow</Link>
            <Link href="/configure-excel" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>⚙️ Configure Excel</Link>
          </nav>
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
            <h2 style={{ marginBottom: '20px' }}>CSV/Excel Format</h2>
            <p style={{ marginBottom: '15px', color: '#666' }}>
              Your CSV or Excel file should have columns that can be mapped to our metadata fields:
            </p>
            <div style={{
              background: '#f5f5f5',
              padding: '15px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '14px',
              marginBottom: '20px'
            }}>
              <div><strong>Required:</strong> title (or will be auto-generated from question text)</div>
              <div><strong>Creator:</strong> Either map a "creator" column OR set a default creator below</div>
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
                Select CSV or Excel File
              </label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
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
                {(isTrivnowFormat || isExcelFormat) && (
                  <div style={{
                    background: '#e3f2fd',
                    border: '1px solid #2196f3',
                    padding: '15px',
                    borderRadius: '4px',
                    marginBottom: '15px'
                  }}>
                    <strong>⚙️ {isExcelFormat ? 'Excel' : 'TrivNow'} Format Detected</strong>
                    <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>
                      Each row will be imported as a separate content item. Map the columns you want to include in the metadata.
                      <br />
                      <strong>Tip:</strong> The "question" column can be mapped to "description", and "source" can be mapped to "creator".
                    </p>
                  </div>
                )}
                <div style={{
                  background: '#f0f7ff',
                  border: '1px solid #0066cc',
                  padding: '15px',
                  borderRadius: '4px',
                  marginBottom: '15px'
                }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                    Default Creator (Required if CSV doesn't have creator column)
                  </label>
                  <input
                    type="text"
                    value={defaultCreator}
                    onChange={(e) => setDefaultCreator(e.target.value)}
                    placeholder="Enter your name or creator name"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '16px'
                    }}
                  />
                  <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#666' }}>
                    This will be used as the creator for all imported items if no creator column is mapped.
                  </p>
                </div>
                <p style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>
                  Map your {fileType === 'excel' ? 'Excel' : 'CSV'} columns to our metadata fields. Auto-detected mappings are shown below.
                  {!(isTrivnowFormat || isExcelFormat) && (
                    <strong style={{ color: '#c62828', display: 'block', marginTop: '5px' }}>
                      Make sure "Title" column is mapped, or set a default creator above!
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
                        <option value="answer">Answer / Correct Answer</option>
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
                {importing ? 'Importing...' : `Import ${fileType === 'excel' ? 'Excel' : 'CSV'}`}
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
