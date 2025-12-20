'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { useUser } from '../contexts/UserContext';
import UserSelector from '../components/UserSelector';
import Navigation from '../components/Navigation';

export default function ConfigureExcelPage() {
  const { currentUser } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [groupingFields, setGroupingFields] = useState<string[]>([]);
  const [detectionPatterns, setDetectionPatterns] = useState<string[]>([]);
  const [configured, setConfigured] = useState(false);
  const [sheetName, setSheetName] = useState<string>('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Get the first sheet (or let user choose)
        const firstSheetName = workbook.SheetNames[0];
        setSheetName(firstSheetName);
        
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 0) {
          // First row should be headers
          const excelHeaders = (jsonData[0] as any[]).map(h => String(h || '').trim()).filter(Boolean);
          setHeaders(excelHeaders);
          setDetectionPatterns(excelHeaders.map(h => h.toLowerCase().trim()));
          
          const autoMapping: Record<string, string> = {};
          excelHeaders.forEach(header => {
            const lower = header.toLowerCase().trim();
            // Auto-mapping logic similar to TrivNow
            if (lower === 'category') {
              autoMapping[header] = 'topics';
            } else if (lower === 'source' || lower === 'author') {
              autoMapping[header] = 'creator';
            } else if (lower === 'question') {
              autoMapping[header] = 'question';
            } else if (lower === 'note' || lower === 'notes') {
              autoMapping[header] = 'question';
            } else if (lower === 'format') {
              autoMapping[header] = 'format';
            } else if (lower === 'round') {
              autoMapping[header] = 'question';
            } else if (lower === 'correctanswer' || lower === 'correct_answer' || lower === 'answer') {
              autoMapping[header] = 'answer';
            }
            // General mappings (fallback)
            else if (lower.includes('title') || lower.includes('name') || lower === 'quiz' || lower === 'set') {
              autoMapping[header] = 'title';
            } else if (lower.includes('creator') || lower.includes('author') || lower.includes('user') || lower.includes('created_by')) {
              autoMapping[header] = 'creator';
            } else if (lower.includes('date') || lower.includes('created') || lower.includes('published')) {
              autoMapping[header] = 'date';
            } else if (lower.includes('topic') || lower.includes('subject')) {
              autoMapping[header] = 'topics';
            } else if (lower.includes('type') && !lower.includes('question')) {
              autoMapping[header] = 'format';
            } else if (lower.includes('question') && lower.includes('count')) {
              autoMapping[header] = 'questionCount';
            } else if (lower.includes('difficulty') || lower.includes('level')) {
              autoMapping[header] = 'difficulty';
            } else if (lower.includes('description') || lower.includes('desc')) {
              autoMapping[header] = 'question';
            }
          });
          setMapping(autoMapping);
          
          // Auto-detect likely quiz-level grouping fields
          const likelyGroupingFields = excelHeaders.filter(h => {
            const lower = h.toLowerCase().trim();
            return ['format', 'timer', 'points', 'speedbonuspool', 'round', 'source', 'category'].includes(lower) ||
                   lower.includes('bonus') || lower.includes('wager') || lower.includes('scoring');
          });
          setGroupingFields(likelyGroupingFields);
        }
      } catch (error) {
        alert(`Error reading Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const handleSave = () => {
    if (!currentUser) {
      alert('Please select a user first before saving configuration.');
      return;
    }

    const config = {
      detectionPatterns,
      columnMapping: mapping,
      groupingFields: groupingFields,
      sheetName: sheetName,
      configuredAt: new Date().toISOString(),
      username: currentUser
    };
    
    localStorage.setItem(`excel-config-${currentUser}`, JSON.stringify(config));
    setConfigured(true);
    alert(`Configuration saved for ${currentUser}! The import page will now use these mappings for Excel format detection.`);
  };

  // Load existing config for current user
  useEffect(() => {
    if (currentUser) {
      const savedConfig = localStorage.getItem(`excel-config-${currentUser}`);
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
          setMapping(config.columnMapping || {});
          setGroupingFields(config.groupingFields || []);
          setDetectionPatterns(config.detectionPatterns || []);
          setSheetName(config.sheetName || '');
          setConfigured(true);
        } catch (e) {
          console.error('Error loading saved config:', e);
        }
      }
    } else {
      // Clear config display if no user
      setMapping({});
      setGroupingFields([]);
      setDetectionPatterns([]);
      setConfigured(false);
    }
  }, [currentUser]);

  const toggleGroupingField = (field: string) => {
    if (groupingFields.includes(field)) {
      setGroupingFields(groupingFields.filter(f => f !== field));
    } else {
      setGroupingFields([...groupingFields, field]);
    }
  };

  return (
    <div>
      <header className="header">
        <div className="container">
          <h1>Configure Excel Format</h1>
          <UserSelector />
          {!currentUser && (
            <div style={{
              background: '#fff3cd',
              border: '1px solid #ffc107',
              padding: '15px',
              borderRadius: '6px',
              marginTop: '15px',
              color: '#856404'
            }}>
              ⚠️ Please select or create a user to configure Excel formats.
            </div>
          )}
          <p>Upload a sample Excel (.xlsx) file to configure automatic detection and mapping</p>
          <Navigation />
        </div>
      </header>

      <main className="container">
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
            <h2 style={{ marginBottom: '20px' }}>Step 1: Upload Sample Excel File</h2>
            <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px', marginBottom: '20px' }} />
            {sheetName && (
              <p style={{ color: '#666', fontSize: '14px' }}>
                Using sheet: <strong>{sheetName}</strong> (first sheet will be used)
              </p>
            )}
          </div>

          {headers.length > 0 && (
            <>
              <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                <h2 style={{ marginBottom: '20px' }}>Step 2: Map Columns</h2>
                <p style={{ color: '#666', marginBottom: '15px' }}>Map each Excel column to our metadata fields. All fields are optional.</p>
                <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '4px', marginBottom: '15px' }}>
                  {headers.map((header) => (
                    <div key={header} style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <label style={{ minWidth: '200px', fontWeight: '500' }}>{header}:</label>
                      <select value={mapping[header] || ''} onChange={(e) => setMapping({ ...mapping, [header]: e.target.value })} style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                        <option value="">-- Skip --</option>
                        <option value="title">Title</option>
                        <option value="creator">Creator</option>
                        <option value="date">Date</option>
                        <option value="topics">Topics</option>
                        <option value="format">Format</option>
                        <option value="questionCount">Question Count</option>
                        <option value="difficulty">Difficulty</option>
                        <option value="types">Types</option>
                        <option value="question">Question</option>
                        <option value="description">Description (deprecated)</option>
                        <option value="answer">Answer / Correct Answer</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                <h2 style={{ marginBottom: '20px' }}>Step 3: Select Quiz-Level Grouping Fields (Optional)</h2>
                <p style={{ color: '#666', marginBottom: '15px' }}>
                  <strong>By default, each row (question) will be imported as a separate content item.</strong>
                  <br /><br />
                  If you want to group questions into quizzes instead, select which fields should be used to group questions. 
                  Questions with the same values for these fields will be grouped together into one content item.
                  <br /><br />
                  <strong>Leave empty to import each question separately.</strong>
                </p>
                <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '4px', marginBottom: '15px', border: '1px solid #2196f3' }}>
                  <strong>💡 Tip:</strong> Common quiz-level fields include: format, timer, points, speedBonusPool, round, source, category, and scoring-related fields.
                  <br />
                  <strong>Note:</strong> If no fields are selected, each Excel row will be imported as a separate content item.
                </div>
                <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '4px', marginBottom: '15px' }}>
                  {headers.map((header) => (
                    <div key={header} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={groupingFields.includes(header)}
                        onChange={() => toggleGroupingField(header)}
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                      <label style={{ fontWeight: '500', cursor: 'pointer', flex: 1 }}>{header}</label>
                      {mapping[header] && (
                        <span style={{ color: '#666', fontSize: '14px' }}>(mapped to: {mapping[header]})</span>
                      )}
                    </div>
                  ))}
                </div>
                {groupingFields.length > 0 && (
                  <div style={{ background: '#fff3cd', padding: '12px', borderRadius: '4px', marginTop: '15px' }}>
                    <strong>Selected grouping fields:</strong> {groupingFields.join(', ')}
                    <br />
                    <span style={{ fontSize: '14px', color: '#666' }}>
                      Questions will be grouped by unique combinations of these fields.
                    </span>
                  </div>
                )}
              </div>

              <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                <h2 style={{ marginBottom: '20px' }}>Step 4: Review Detection Patterns</h2>
                <p style={{ color: '#666', marginBottom: '15px' }}>These patterns will be used to detect Excel format. You can edit them:</p>
                <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '4px', marginBottom: '15px' }}>
                  {detectionPatterns.map((pattern, idx) => (
                    <div key={idx} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="text" value={pattern} onChange={(e) => { const newPatterns = [...detectionPatterns]; newPatterns[idx] = e.target.value; setDetectionPatterns(newPatterns); }} style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'monospace' }} />
                      <button onClick={() => { setDetectionPatterns(detectionPatterns.filter((_, i) => i !== idx)); }} style={{ padding: '8px 12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Remove</button>
                    </div>
                  ))}
                  <button onClick={() => setDetectionPatterns([...detectionPatterns, ''])} style={{ padding: '8px 12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}>+ Add Pattern</button>
                </div>
              </div>

              <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                <h2 style={{ marginBottom: '20px' }}>Step 5: Save Configuration</h2>
                <button onClick={handleSave} style={{ padding: '12px 24px', background: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer', marginBottom: '15px' }}>Save Configuration</button>
                {configured && <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '4px', color: '#2e7d32' }}>✓ Configuration saved! The import page will use these mappings for Excel format.</div>}
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
            <Link href="/import" style={{ padding: '12px 24px', background: '#666', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>Back to Import</Link>
            <Link href="/" style={{ padding: '12px 24px', background: '#666', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>Home</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

