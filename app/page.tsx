'use client';

import { useState, useEffect, useMemo } from 'react';
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

interface ContentResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  content: ContentItem[];
  error?: string;
}

type ViewMode = 'search' | 'browse' | 'stats' | 'topics' | 'creators';

export default function HomePage() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedCreator, setSelectedCreator] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('search');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const limit = 50;

  // Load statistics
  useEffect(() => {
    fetch('/api/content?limit=1')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTotalCount(data.total || 0);
        }
      })
      .catch(() => {});
  }, []);

  // Load content with pagination
  const loadContent = async (pageNum: number = 1, reset: boolean = false) => {
    setLoading(true);
    setError(null);
    
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.append('search', searchQuery.trim());
    if (selectedTopic) params.append('topics', selectedTopic);
    if (selectedCreator) params.append('creator', selectedCreator);
    if (selectedDifficulty) params.append('difficulty', selectedDifficulty);
    if (selectedFormat) params.append('format', selectedFormat);
    params.append('page', pageNum.toString());
    params.append('limit', limit.toString());

    try {
      const response = await fetch(`/api/content?${params.toString()}`);
      const data: ContentResponse = await response.json();
      
      if (data.success) {
        if (reset) {
          setContent(data.content);
        } else {
          setContent(prev => [...prev, ...data.content]);
        }
        setTotalPages(data.totalPages);
        setTotalCount(data.total);
        setPage(pageNum);
      } else {
        setError(data.error || 'Failed to load content');
      }
    } catch (err) {
      setError('Failed to load content. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load topics and creators for filters
  const [allTopics, setAllTopics] = useState<string[]>([]);
  const [allCreators, setAllCreators] = useState<string[]>([]);
  const [allDifficulties, setAllDifficulties] = useState<string[]>([]);
  const [allFormats, setAllFormats] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/topics').then(r => r.json()),
      fetch('/api/creators').then(r => r.json())
    ]).then(([topicsData, creatorsData]) => {
      if (topicsData.success) setAllTopics(topicsData.topics || []);
      if (creatorsData.success) setAllCreators(creatorsData.creators || []);
    }).catch(() => {});
  }, []);

  // Search handler
  const handleSearch = () => {
    setPage(1);
    loadContent(1, true);
  };

  // Load initial content only if in browse mode
  useEffect(() => {
    if (viewMode === 'browse' && content.length === 0) {
      loadContent(1, true);
    }
  }, [viewMode]);

  const hasFilters = searchQuery.trim() || selectedTopic || selectedCreator || selectedDifficulty || selectedFormat;

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
              <strong>{totalCount.toLocaleString()}</strong> total items in repository
              {hasFilters && (
                <> • <strong>{content.length}</strong> shown (page {page} of {totalPages})</>
              )}
            </p>
          </div>

          {/* View Mode Tabs */}
          <div style={{
            background: '#fff',
            padding: '15px 25px',
            borderRadius: '8px 8px 0 0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderBottom: '2px solid #e0e0e0',
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            {[
              { mode: 'search', label: '🔍 Search', desc: 'Find specific content' },
              { mode: 'browse', label: '📚 Browse', desc: 'Browse all content' },
              { mode: 'stats', label: '📊 Statistics', desc: 'View repository stats' },
              { mode: 'topics', label: '🏷️ Topics', desc: 'Browse by topic' },
              { mode: 'creators', label: '👤 Creators', desc: 'Browse by creator' }
            ].map(({ mode, label, desc }) => (
              <button
                key={mode}
                onClick={() => {
                  setViewMode(mode as ViewMode);
                  if (mode === 'browse' && content.length === 0) {
                    loadContent(1, true);
                  }
                }}
                title={desc}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderBottom: viewMode === mode ? '3px solid #0066cc' : '3px solid transparent',
                  background: 'transparent',
                  color: viewMode === mode ? '#0066cc' : '#666',
                  cursor: 'pointer',
                  fontWeight: viewMode === mode ? '600' : '500',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s'
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search Interface */}
          {viewMode === 'search' && (
            <div style={{
              background: '#fff',
              padding: '30px',
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '25px'
            }}>
              <h2 style={{ marginBottom: '20px' }}>Search Content</h2>
              <p style={{ color: '#666', marginBottom: '20px' }}>
                Search through {totalCount.toLocaleString()} items. Use filters to narrow your results.
              </p>

              <div style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="Search by title, creator, topic, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    border: '2px solid #0066cc',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
              </div>

              <div className="filters">
                <div className="filter-group">
                  <label>Topic</label>
                  <select
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    style={{ minWidth: '180px' }}
                  >
                    <option value="">All Topics</option>
                    {allTopics.map(topic => (
                      <option key={topic} value={topic}>{topic}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Creator</label>
                  <select
                    value={selectedCreator}
                    onChange={(e) => setSelectedCreator(e.target.value)}
                    style={{ minWidth: '180px' }}
                  >
                    <option value="">All Creators</option>
                    {allCreators.map(creator => (
                      <option key={creator} value={creator}>{creator}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Difficulty</label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    style={{ minWidth: '150px' }}
                  >
                    <option value="">All Levels</option>
                    <option value="beginner">Beginner</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>Format</label>
                  <select
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    style={{ minWidth: '150px' }}
                  >
                    <option value="">All Formats</option>
                    <option value="csv">CSV</option>
                    <option value="xlsx">Excel</option>
                    <option value="pdf">PDF</option>
                    <option value="txt">Text</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  style={{
                    padding: '12px 24px',
                    background: '#0066cc',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
                {(hasFilters || content.length > 0) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedTopic('');
                      setSelectedCreator('');
                      setSelectedDifficulty('');
                      setSelectedFormat('');
                      setContent([]);
                      setPage(1);
                    }}
                    style={{
                      padding: '12px 24px',
                      background: '#f5f5f5',
                      color: '#333',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '16px',
                      cursor: 'pointer'
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Browse Mode */}
          {viewMode === 'browse' && (
            <div style={{
              background: '#fff',
              padding: '30px',
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '25px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Browse All Content</h2>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  Showing page {page} of {totalPages} ({content.length} items)
                </div>
              </div>
            </div>
          )}

          {/* Statistics View */}
          {viewMode === 'stats' && (
            <div style={{
              background: '#fff',
              padding: '30px',
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '25px'
            }}>
              <h2 style={{ marginBottom: '20px' }}>Repository Statistics</h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
              }}>
                <div style={{
                  padding: '20px',
                  background: '#e3f2fd',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1976d2' }}>
                    {totalCount.toLocaleString()}
                  </div>
                  <div style={{ color: '#666', marginTop: '5px' }}>Total Items</div>
                </div>
                <div style={{
                  padding: '20px',
                  background: '#f3e5f5',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#7b1fa2' }}>
                    {allTopics.length}
                  </div>
                  <div style={{ color: '#666', marginTop: '5px' }}>Topics</div>
                </div>
                <div style={{
                  padding: '20px',
                  background: '#e8f5e9',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#388e3c' }}>
                    {allCreators.length}
                  </div>
                  <div style={{ color: '#666', marginTop: '5px' }}>Creators</div>
                </div>
              </div>
              <p style={{ color: '#666', fontStyle: 'italic' }}>
                Use Search or Browse modes to explore the content.
              </p>
            </div>
          )}

          {/* Topics View */}
          {viewMode === 'topics' && (
            <div style={{
              background: '#fff',
              padding: '30px',
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '25px'
            }}>
              <h2 style={{ marginBottom: '20px' }}>Browse by Topic</h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '15px'
              }}>
                {allTopics.map(topic => (
                  <button
                    key={topic}
                    onClick={() => {
                      setSelectedTopic(topic);
                      setViewMode('search');
                      setSearchQuery('');
                      setTimeout(() => handleSearch(), 100);
                    }}
                    style={{
                      padding: '15px',
                      background: '#f5f5f5',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      fontSize: '0.95rem',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e3f2fd';
                      e.currentTarget.style.borderColor = '#0066cc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f5f5f5';
                      e.currentTarget.style.borderColor = '#e0e0e0';
                    }}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Creators View */}
          {viewMode === 'creators' && (
            <div style={{
              background: '#fff',
              padding: '30px',
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '25px'
            }}>
              <h2 style={{ marginBottom: '20px' }}>Browse by Creator</h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '15px'
              }}>
                {allCreators.map(creator => (
                  <button
                    key={creator}
                    onClick={() => {
                      setSelectedCreator(creator);
                      setViewMode('search');
                      setSearchQuery('');
                      setTimeout(() => handleSearch(), 100);
                    }}
                    style={{
                      padding: '15px',
                      background: '#f5f5f5',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      fontSize: '0.95rem',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e8f5e9';
                      e.currentTarget.style.borderColor = '#4caf50';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f5f5f5';
                      e.currentTarget.style.borderColor = '#e0e0e0';
                    }}
                  >
                    {creator}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Content Display */}
          {loading && content.length === 0 ? (
            <div className="loading">
              <p>Loading content...</p>
            </div>
          ) : error ? (
            <div className="error">
              <strong>Error:</strong> {error}
            </div>
          ) : content.length === 0 && (viewMode === 'search' || viewMode === 'browse') ? (
            <div style={{
              background: '#fff',
              padding: '60px 30px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center',
              color: '#666'
            }}>
              <h2 style={{ marginBottom: '15px', color: '#333' }}>
                {viewMode === 'search' ? 'No results found' : 'Start browsing'}
              </h2>
              <p style={{ marginBottom: '20px' }}>
                {viewMode === 'search'
                  ? 'Try adjusting your search terms or filters.'
                  : 'Click "Browse" to load content, or use Search to find specific items.'}
              </p>
            </div>
          ) : (viewMode === 'search' || viewMode === 'browse') && content.length > 0 ? (
            <>
              <div className="content-grid">
                {content.map(item => (
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
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '10px',
                  marginTop: '30px',
                  padding: '20px',
                  background: '#fff',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <button
                    onClick={() => {
                      const newPage = Math.max(1, page - 1);
                      loadContent(newPage, true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={page === 1 || loading}
                    style={{
                      padding: '10px 20px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      background: page === 1 ? '#f5f5f5' : '#fff',
                      cursor: page === 1 ? 'not-allowed' : 'pointer',
                      opacity: page === 1 ? 0.5 : 1
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '0 15px', color: '#666' }}>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => {
                      const newPage = Math.min(totalPages, page + 1);
                      loadContent(newPage, true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={page === totalPages || loading}
                    style={{
                      padding: '10px 20px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      background: page === totalPages ? '#f5f5f5' : '#fff',
                      cursor: page === totalPages ? 'not-allowed' : 'pointer',
                      opacity: page === totalPages ? 0.5 : 1
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
