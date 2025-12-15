'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ContentItem {
  id: string;
  path: string;
  metadata: {
    title?: string;
    creator?: string;
    date?: string;
    topics?: string[];
    format?: string;
    questionCount?: number;
    difficulty?: string;
    types?: string[];
    description?: string;
  };
  files: string[];
}

export default function HomePage() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([]);

  useEffect(() => {
    fetch('/api/content')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setContent(data.content || []);
          setFilteredContent(data.content || []);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading content:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredContent(content);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = content.filter(item => {
      const { metadata } = item;
      if (metadata.title?.toLowerCase().includes(query)) return true;
      if (metadata.description?.toLowerCase().includes(query)) return true;
      if (metadata.creator?.toLowerCase().includes(query)) return true;
      if (metadata.topics?.some(topic => topic.toLowerCase().includes(query))) return true;
      return false;
    });
    setFilteredContent(filtered);
  }, [searchQuery, content]);

  return (
    <div>
      <header className="header">
        <div className="container">
          <h1>Trivia Content Repository</h1>
          <p>A collaborative repository for trivia content creators</p>
          <nav style={{ marginTop: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <Link href="/" style={{ color: '#ff6600', textDecoration: 'none', fontWeight: '600' }}>Home</Link>
            <Link href="/submit" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>Submit Content</Link>
            <Link href="/import" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>Import CSV/Excel</Link>
            <Link href="/configure-trivnow" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>⚙️ Configure TrivNow</Link>
            <Link href="/configure-excel" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>⚙️ Configure Excel</Link>
            <a href="/api/content" target="_blank" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>API: Content</a>
            <a href="/api/topics" target="_blank" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>API: Topics</a>
            <a href="/api/creators" target="_blank" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>API: Creators</a>
          </nav>
        </div>
      </header>

      <main className="container">
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            background: '#fff',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
            <h2 style={{ marginBottom: '20px' }}>Search Content</h2>
            <input
              type="text"
              placeholder="Search by title, creator, topic, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px'
              }}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>Loading content...</p>
            </div>
          ) : (
            <div style={{
              background: '#fff',
              padding: '30px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ marginBottom: '20px' }}>
                Content Library ({filteredContent.length} {filteredContent.length === 1 ? 'item' : 'items'})
              </h2>
              
              {filteredContent.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  <p>No content found.</p>
                  <p style={{ marginTop: '10px' }}>
                    <Link href="/submit" style={{ color: '#0066cc', textDecoration: 'none' }}>
                      Submit your first content
                    </Link>
                    {' or '}
                    <Link href="/import" style={{ color: '#0066cc', textDecoration: 'none' }}>
                      import from CSV/Excel
                    </Link>
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '20px' }}>
                  {filteredContent.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        padding: '20px',
                        background: '#fafafa'
                      }}
                    >
                      <h3 style={{ marginTop: 0, marginBottom: '10px' }}>
                        {item.metadata.title || 'Untitled'}
                      </h3>
                      <div style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>
                        {item.metadata.creator && (
                          <span style={{ marginRight: '15px' }}>
                            <strong>Creator:</strong> {item.metadata.creator}
                          </span>
                        )}
                        {item.metadata.date && (
                          <span style={{ marginRight: '15px' }}>
                            <strong>Date:</strong> {item.metadata.date}
                          </span>
                        )}
                        {item.metadata.format && (
                          <span style={{ marginRight: '15px' }}>
                            <strong>Format:</strong> {item.metadata.format}
                          </span>
                        )}
                        {item.metadata.questionCount && (
                          <span style={{ marginRight: '15px' }}>
                            <strong>Questions:</strong> {item.metadata.questionCount}
                          </span>
                        )}
                      </div>
                      {item.metadata.topics && item.metadata.topics.length > 0 && (
                        <div style={{ marginBottom: '10px' }}>
                          <strong>Topics:</strong>{' '}
                          {item.metadata.topics.map((topic, idx) => (
                            <span key={idx} style={{
                              display: 'inline-block',
                              background: '#e3f2fd',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              marginRight: '5px',
                              fontSize: '12px'
                            }}>
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.metadata.description && (
                        <p style={{ color: '#666', marginBottom: '10px' }}>
                          {item.metadata.description.substring(0, 200)}
                          {item.metadata.description.length > 200 ? '...' : ''}
                        </p>
                      )}
                      {item.files && item.files.length > 0 && (
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          <strong>Files:</strong> {item.files.length} file{item.files.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
