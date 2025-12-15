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
    answer?: string;
  };
  files: string[];
}

export default function HomePage() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedCreator, setSelectedCreator] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/content')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setContent(data.content || []);
          setFilteredContent(data.content || []);
        } else {
          setError(data.error || 'Failed to load content');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading content:', err);
        setError('Failed to load content. Please try again later.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let filtered = [...content];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const { metadata } = item;
        if (metadata.title?.toLowerCase().includes(query)) return true;
        if (metadata.description?.toLowerCase().includes(query)) return true;
        if (metadata.creator?.toLowerCase().includes(query)) return true;
        if (metadata.topics?.some(topic => topic.toLowerCase().includes(query))) return true;
        return false;
      });
    }

    // Apply topic filter
    if (selectedTopic) {
      filtered = filtered.filter(item => 
        item.metadata.topics?.some(topic => topic.toLowerCase() === selectedTopic.toLowerCase())
      );
    }

    // Apply creator filter
    if (selectedCreator) {
      filtered = filtered.filter(item => 
        item.metadata.creator?.toLowerCase() === selectedCreator.toLowerCase()
      );
    }

    setFilteredContent(filtered);
  }, [searchQuery, selectedTopic, selectedCreator, content]);

  // Get unique topics and creators for filters
  const allTopics = Array.from(new Set(
    content.flatMap(item => item.metadata.topics || [])
  )).sort();

  const allCreators = Array.from(new Set(
    content.map(item => item.metadata.creator).filter(Boolean) as string[]
  )).sort();

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
            <Link href="/admin/delete" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>Admin: Delete</Link>
          </nav>
        </div>
      </header>

      <main className="container">
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Stats Bar */}
          <div className="stats">
            <p>
              <strong>{content.length}</strong> total items
              {filteredContent.length !== content.length && (
                <> • <strong>{filteredContent.length}</strong> filtered results</>
              )}
            </p>
          </div>

          {/* Search and Filters */}
          <div style={{
            background: '#fff',
            padding: '25px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '25px'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                Search Content
              </label>
              <input
                type="text"
                placeholder="Search by title, creator, topic, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#0066cc'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            <div className="filters">
              <div className="filter-group">
                <label>Filter by Topic</label>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  style={{ minWidth: '200px' }}
                >
                  <option value="">All Topics</option>
                  {allTopics.map(topic => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Filter by Creator</label>
                <select
                  value={selectedCreator}
                  onChange={(e) => setSelectedCreator(e.target.value)}
                  style={{ minWidth: '200px' }}
                >
                  <option value="">All Creators</option>
                  {allCreators.map(creator => (
                    <option key={creator} value={creator}>{creator}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group" style={{ marginLeft: 'auto', alignItems: 'flex-end' }}>
                <label>View Mode</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setViewMode('cards')}
                    style={{
                      padding: '8px 16px',
                      border: '2px solid',
                      borderColor: viewMode === 'cards' ? '#0066cc' : '#ddd',
                      background: viewMode === 'cards' ? '#0066cc' : '#fff',
                      color: viewMode === 'cards' ? '#fff' : '#333',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Cards
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    style={{
                      padding: '8px 16px',
                      border: '2px solid',
                      borderColor: viewMode === 'table' ? '#0066cc' : '#ddd',
                      background: viewMode === 'table' ? '#0066cc' : '#fff',
                      color: viewMode === 'table' ? '#fff' : '#333',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Table
                  </button>
                </div>
              </div>
            </div>

            {(selectedTopic || selectedCreator || searchQuery) && (
              <div style={{ marginTop: '15px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedTopic('');
                    setSelectedCreator('');
                  }}
                  style={{
                    padding: '6px 12px',
                    background: '#f5f5f5',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          {/* Content Display */}
          {loading ? (
            <div className="loading">
              <p>Loading content...</p>
            </div>
          ) : error ? (
            <div className="error">
              <strong>Error:</strong> {error}
            </div>
          ) : filteredContent.length === 0 ? (
            <div style={{
              background: '#fff',
              padding: '60px 30px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center',
              color: '#666'
            }}>
              <h2 style={{ marginBottom: '15px', color: '#333' }}>No content found</h2>
              <p style={{ marginBottom: '20px' }}>
                {content.length === 0
                  ? "The repository is empty. Be the first to add content!"
                  : "Try adjusting your search or filters."}
              </p>
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link
                  href="/submit"
                  style={{
                    padding: '12px 24px',
                    background: '#0066cc',
                    color: '#fff',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontWeight: '600',
                    display: 'inline-block'
                  }}
                >
                  Submit Content
                </Link>
                <Link
                  href="/import"
                  style={{
                    padding: '12px 24px',
                    background: '#28a745',
                    color: '#fff',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontWeight: '600',
                    display: 'inline-block'
                  }}
                >
                  Import CSV/Excel
                </Link>
              </div>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="content-grid">
              {filteredContent.map((item) => (
                <div key={item.id} className="content-card">
                  <h3>{item.metadata.title || 'Untitled'}</h3>
                  
                  <div className="meta-bar">
                    {item.metadata.creator && (
                      <div className="meta-item">
                        <strong>Creator:</strong> {item.metadata.creator}
                      </div>
                    )}
                    {item.metadata.date && (
                      <div className="meta-item">
                        <strong>Date:</strong> {new Date(item.metadata.date).toLocaleDateString()}
                      </div>
                    )}
                    {item.metadata.format && (
                      <div className="meta-item">
                        <strong>Format:</strong> {item.metadata.format}
                      </div>
                    )}
                    {item.metadata.questionCount && (
                      <div className="meta-item">
                        <strong>Questions:</strong> {item.metadata.questionCount}
                      </div>
                    )}
                    {item.metadata.difficulty && (
                      <div className="meta-item">
                        <strong>Difficulty:</strong> {item.metadata.difficulty}
                      </div>
                    )}
                  </div>

                  {item.metadata.description && (
                    <div className="description">
                      {item.metadata.description.length > 150
                        ? `${item.metadata.description.substring(0, 150)}...`
                        : item.metadata.description}
                    </div>
                  )}

                  {item.metadata.topics && item.metadata.topics.length > 0 && (
                    <div className="topics">
                      {item.metadata.topics.map((topic, idx) => (
                        <span key={idx} className="topic-tag">{topic}</span>
                      ))}
                    </div>
                  )}

                  {item.metadata.types && item.metadata.types.length > 0 && (
                    <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#666' }}>
                      <strong>Types:</strong> {item.metadata.types.join(', ')}
                    </div>
                  )}

                  {item.metadata.answer && (
                    <div style={{
                      marginTop: '12px',
                      padding: '10px',
                      background: '#e8f5e9',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}>
                      <strong style={{ color: '#2e7d32' }}>Answer:</strong>{' '}
                      <span style={{ color: '#1b5e20' }}>{item.metadata.answer}</span>
                    </div>
                  )}

                  {item.files && item.files.length > 0 && (
                    <div className="files">
                      <strong style={{ fontSize: '0.85rem', color: '#666' }}>Files:</strong>
                      {item.files.map((file, idx) => (
                        <a
                          key={idx}
                          href={`/api/files/${item.path}/${file}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {file}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="content-table-container">
              <table className="content-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Creator</th>
                    <th>Date</th>
                    <th>Topics</th>
                    <th>Description</th>
                    <th>Answer</th>
                    <th>Format</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContent.map((item) => (
                    <tr key={item.id}>
                      <td className="question-cell">
                        <div className="question-text">
                          <strong>{item.metadata.title || 'Untitled'}</strong>
                        </div>
                      </td>
                      <td>{item.metadata.creator || '-'}</td>
                      <td>{item.metadata.date ? new Date(item.metadata.date).toLocaleDateString() : '-'}</td>
                      <td>
                        {item.metadata.topics && item.metadata.topics.length > 0 ? (
                          <div className="topics-list">
                            {item.metadata.topics.map((topic, idx) => (
                              <span key={idx} className="topic-tag-inline">{topic}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="question-cell">
                        <div className="question-text">
                          {item.metadata.description
                            ? (item.metadata.description.length > 100
                                ? `${item.metadata.description.substring(0, 100)}...`
                                : item.metadata.description)
                            : <span className="text-muted">-</span>}
                        </div>
                      </td>
                      <td className="answer-cell">
                        {item.metadata.answer ? (
                          <div className="answer-text">{item.metadata.answer}</div>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>{item.metadata.format || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
