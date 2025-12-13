'use client';

import { useState } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';

export default function ConfigureTrivNowPage() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [detectionPatterns, setDetectionPatterns] = useState<string[]>([]);
  const [configured, setConfigured] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        preview: 1,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const csvHeaders = Object.keys(results.data[0] as any);
            setHeaders(csvHeaders);
            setDetectionPatterns(csvHeaders.map(h => h.toLowerCase().trim()));
            
            const autoMapping: Record<string, string> = {};
            csvHeaders.forEach(header => {
              const lower = header.toLowerCase().trim();
              // TrivNow-specific mappings
              if (lower === 'category') {
                autoMapping[header] = 'topics';
              } else if (lower === 'source') {
                autoMapping[header] = 'creator';
              } else if (lower === 'question') {
                autoMapping[header] = 'description';
              } else if (lower === 'note') {
                autoMapping[header] = 'description';
              } else if (lower === 'format') {
                autoMapping[header] = 'format';
              } else if (lower === 'round') {
                // Could be used for grouping/organization
                autoMapping[header] = 'description';
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
              } else if (lower.includes('type')) {
                autoMapping[header] = 'format';
              } else if (lower.includes('question') && lower.includes('count')) {
                autoMapping[header] = 'questionCount';
              } else if (lower.includes('difficulty') || lower.includes('level')) {
                autoMapping[header] = 'difficulty';
              } else if (lower.includes('description') || lower.includes('desc')) {
                autoMapping[header] = 'description';
              }
            });
            setMapping(autoMapping);
          }
        },
        error: (error) => {
          alert(`Error reading CSV: ${error.message}`);
        }
      });
    }
  };

  const handleSave = () => {
    const config = {
      detectionPatterns,
      columnMapping: mapping,
      configuredAt: new Date().toISOString()
    };
    
    localStorage.setItem('trivnow-config', JSON.stringify(config));
    setConfigured(true);
    alert('Configuration saved! The import page will now use these mappings for TrivNow format detection.');
  };

  return (
    <div>
      <header className="header">
        <div className="container">
          <h1>Configure TrivNow Format</h1>
          <p>Upload a sample TrivNow CSV to configure automatic detection and mapping</p>
          <nav style={{ marginTop: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <Link href="/" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>Home</Link>
            <Link href="/submit" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>Submit Content</Link>
            <Link href="/import" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>Import CSV</Link>
            <Link href="/configure-trivnow" style={{ color: '#ff6600', textDecoration: 'none', fontWeight: '600' }}>⚙️ Configure TrivNow</Link>
            <a href="/api/content" target="_blank" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>API: Content</a>
            <a href="/api/topics" target="_blank" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>API: Topics</a>
            <a href="/api/creators" target="_blank" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>API: Creators</a>
            <a href="/api/db-init" target="_blank" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>DB Init</a>
          </nav>
        </div>
      </header>

      <main className="container">
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
            <h2 style={{ marginBottom: '20px' }}>Step 1: Upload Sample CSV</h2>
            <input type="file" accept=".csv" onChange={handleFileChange} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px', marginBottom: '20px' }} />
          </div>

          {headers.length > 0 && (
            <>
              <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                <h2 style={{ marginBottom: '20px' }}>Step 2: Map Columns</h2>
                <p style={{ color: '#666', marginBottom: '15px' }}>Map each TrivNow column to our metadata fields. All fields are optional.</p>
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
                        <option value="description">Description</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                <h2 style={{ marginBottom: '20px' }}>Step 3: Review Detection Patterns</h2>
                <p style={{ color: '#666', marginBottom: '15px' }}>These patterns will be used to detect TrivNow format. You can edit them:</p>
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
                <h2 style={{ marginBottom: '20px' }}>Step 4: Save Configuration</h2>
                <button onClick={handleSave} style={{ padding: '12px 24px', background: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer', marginBottom: '15px' }}>Save Configuration</button>
                {configured && <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '4px', color: '#2e7d32' }}>✓ Configuration saved! The import page will use these mappings for TrivNow format.</div>}
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
