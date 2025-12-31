'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '../../contexts/UserContext';
import Navigation from '../../components/Navigation';

interface ParsedRow {
  [key: string]: any;
}

export default function GoogleDocsImportPage() {
  const { currentUser } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [documentId, setDocumentId] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
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
      // Store token in sessionStorage for persistence
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('google_access_token', token);
        const refreshToken = searchParams.get('refresh_token');
        if (refreshToken) {
          sessionStorage.setItem('google_refresh_token', refreshToken);
        }
      }
    } else if (typeof window !== 'undefined') {
      // Try to get from sessionStorage
      const storedToken = sessionStorage.getItem('google_access_token');
      if (storedToken) {
        setAccessToken(storedToken);
      }
    }
  }, [searchParams]);

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
    // Handle various Google Docs URL formats
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
          accessToken: accessToken
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch document');
      }
      
      setParsedData(data.data || []);
      setDocumentTitle(data.documentTitle || 'Untitled Document');
      
      if (data.data.length === 0) {
        setError('No data found in document. Make sure it contains tables or Q&A formatted content.');
      }
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
    
    if (parsedData.length === 0) {
      setError('No data to import');
      return;
    }
    
    setImporting(true);
    setProgress({ current: 0, total: parsedData.length, imported: 0, errors: 0 });
    setError(null);
    
    let imported = 0;
    let errors = 0;
    
    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      setProgress({ current: i + 1, total: parsedData.length, imported, errors });
      
      try {
        // Map parsed data to metadata format
        const metadata: any = {
          creator: currentUser,
          question: row.question || row.Question || '',
          description: row.question || row.Question || '',
          answer: row.answer || row.Answer || '',
          topics: row.topics ? (Array.isArray(row.topics) ? row.topics : row.topics.split(',').map((t: string) => t.trim())) : [],
          options: row.options ? (Array.isArray(row.options) ? row.options : row.options.split(';').map((o: string) => o.trim())) : [],
          explanation: row.explanation || row.Explanation || '',
          notes: row.notes || row.Notes || '',
          source: row.source || row.Source || '',
          media: row.media || row.Media || '',
          alternateAnswers: row.alternateAnswers || row['Alternate Answers'] ? 
            (Array.isArray(row.alternateAnswers || row['Alternate Answers']) ? 
              (row.alternateAnswers || row['Alternate Answers']) : 
              String(row.alternateAnswers || row['Alternate Answers']).split(',').map((a: string) => a.trim())) : [],
          types: row.types || row.format || row.Format ? 
            (Array.isArray(row.types || row.format || row.Format) ? 
              (row.types || row.format || row.Format) : 
              String(row.types || row.format || row.Format).split(',').map((t: string) => t.trim())) : [],
          date: row.date || row.Date || undefined
        };
        
        // Remove empty fields
        Object.keys(metadata).forEach(key => {
          if (metadata[key] === '' || (Array.isArray(metadata[key]) && metadata[key].length === 0)) {
            delete metadata[key];
          }
        });
        
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
    
    setProgress({ current: parsedData.length, total: parsedData.length, imported, errors });
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
            Paste the full Google Docs URL or just the document ID. The document should contain tables or Q&A formatted content.
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
      
      {parsedData.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h2>Step 3: Review and Import</h2>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Found {parsedData.length} rows in "{documentTitle}". Review the data below and click Import to add to your database.
          </p>
          
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
          
          <div style={{ marginTop: '20px', maxHeight: '400px', overflow: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
                  {Object.keys(parsedData[0] || {}).map(key => (
                    <th key={key} style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600' }}>
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedData.slice(0, 10).map((row, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                    {Object.keys(parsedData[0] || {}).map(key => (
                      <td key={key} style={{ padding: '10px', border: '1px solid #dee2e6', fontSize: '14px' }}>
                        {String(row[key] || '').substring(0, 100)}
                        {String(row[key] || '').length > 100 ? '...' : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedData.length > 10 && (
              <div style={{ padding: '10px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
                Showing first 10 of {parsedData.length} rows
              </div>
            )}
          </div>
          
          <button
            onClick={handleImport}
            disabled={importing}
            style={{
              marginTop: '20px',
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
            {importing ? 'Importing...' : `Import ${parsedData.length} Questions`}
          </button>
        </div>
      )}
    </div>
  );
}

