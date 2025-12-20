'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ContentItem {
  id: string;
  title: string;
  creator: string;
  date: string;
  topics?: string[];
}

export default function AdminDeletePage() {
  const [creator, setCreator] = useState('');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; deletedCount?: number } | null>(null);

  const handleSearch = async () => {
    if (!creator.trim()) {
      alert('Please enter a creator name');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(`/api/delete-by-creator?creator=${encodeURIComponent(creator.trim())}`);
      const data = await response.json();
      
      if (data.success) {
        setItems(data.items || []);
        if (data.items.length === 0) {
          setResult({
            success: true,
            message: `No content found for creator: ${creator}`
          });
        }
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to fetch content'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch content'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!creator.trim()) {
      alert('Please enter a creator name');
      return;
    }

    if (items.length === 0) {
      alert('No items to delete. Please search first.');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${items.length} item(s) by "${creator}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    setResult(null);
    try {
      const response = await fetch(`/api/delete-by-creator?creator=${encodeURIComponent(creator.trim())}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        setResult({
          success: true,
          message: data.message,
          deletedCount: data.deletedCount
        });
        setItems([]);
        setCreator('');
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to delete content'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete content'
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <header className="header">
        <div className="container">
          <h1>Admin: Delete Content</h1>
          <p>Delete content by creator name</p>
          <Navigation />
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
            <h2 style={{ marginBottom: '20px' }}>Delete Content by Creator</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Enter a creator name to find and delete all content items created by that person.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Creator Name
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={creator}
                  onChange={(e) => setCreator(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="e.g., Caleb Greyman"
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '16px'
                  }}
                />
                <button
                  onClick={handleSearch}
                  disabled={loading || !creator.trim()}
                  style={{
                    padding: '10px 20px',
                    background: loading || !creator.trim() ? '#ccc' : '#0066cc',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '16px',
                    cursor: loading || !creator.trim() ? 'not-allowed' : 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {result && (
              <div style={{
                padding: '15px',
                borderRadius: '4px',
                marginBottom: '20px',
                background: result.success ? '#e8f5e9' : '#ffebee',
                color: result.success ? '#2e7d32' : '#c62828',
                border: `1px solid ${result.success ? '#4caf50' : '#f44336'}`
              }}>
                <strong>{result.success ? '✓' : '✗'}</strong> {result.message}
              </div>
            )}

            {items.length > 0 && (
              <div style={{ marginTop: '30px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '15px'
                }}>
                  <h3 style={{ margin: 0 }}>
                    Found {items.length} item{items.length !== 1 ? 's' : ''}
                  </h3>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    style={{
                      padding: '10px 20px',
                      background: deleting ? '#ccc' : '#dc3545',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '16px',
                      cursor: deleting ? 'not-allowed' : 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    {deleting ? 'Deleting...' : `Delete All (${items.length})`}
                  </button>
                </div>

                <div style={{
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>ID</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Title</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Date</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Topics</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={item.id} style={{ borderBottom: idx < items.length - 1 ? '1px solid #eee' : 'none' }}>
                          <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{item.id}</td>
                          <td style={{ padding: '12px' }}>{item.title || '(No title)'}</td>
                          <td style={{ padding: '12px', color: '#666' }}>{item.date || '-'}</td>
                          <td style={{ padding: '12px', color: '#666' }}>
                            {item.topics && item.topics.length > 0 ? item.topics.join(', ') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{
                  marginTop: '15px',
                  padding: '12px',
                  background: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '4px',
                  fontSize: '14px',
                  color: '#856404'
                }}>
                  <strong>⚠️ Warning:</strong> Deleting will permanently remove all {items.length} item{items.length !== 1 ? 's' : ''} by "{creator}". This action cannot be undone.
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

