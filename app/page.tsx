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

type ViewMode = 'cards' | 'table' | 'timeline' | 'grid' | 'compact' | 'magazine' | 'kanban';

export default function HomePage() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedCreator, setSelectedCreator] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
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

    if (selectedTopic) {
      filtered = filtered.filter(item => 
        item.metadata.topics?.some(topic => topic.toLowerCase() === selectedTopic.toLowerCase())
      );
    }

    if (selectedCreator) {
      filtered = filtered.filter(item => 
        item.metadata.creator?.toLowerCase() === selectedCreator.toLowerCase()
      );
    }

    setFilteredContent(filtered);
  }, [searchQuery, selectedTopic, selectedCreator, content]);

  const allTopics = Array.from(new Set(
    content.flatMap(item => item.metadata.topics || [])
  )).sort();

  const allCreators = Array.from(new Set(
    content.map(item => item.metadata.creator).filter(Boolean) as string[]
  )).sort();

  // Group content by date for timeline
  const contentByDate = useMemo(() => {
    const grouped: Record<string, ContentItem[]> = {};
    filteredContent.forEach(item => {
      const date = item.metadata.date ? new Date(item.metadata.date).toLocaleDateString() : 'No Date';
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(item);
    });
    return grouped;
  }, [filteredContent]);

  // Group content by topic for kanban
  const contentByTopic = useMemo(() => {
    const grouped: Record<string, ContentItem[]> = {};
    filteredContent.forEach(item => {
      const topics = item.metadata.topics && item.metadata.topics.length > 0 
        ? item.metadata.topics 
        : ['Uncategorized'];
      topics.forEach(topic => {
        if (!grouped[topic]) grouped[topic] = [];
        grouped[topic].push(item);
      });
    });
    return grouped;
  }, [filteredContent]);

  const renderCard = (item: ContentItem, size: 'normal' | 'compact' | 'large' = 'normal') => {
    const isCompact = size === 'compact';
    const isLarge = size === 'large';
    
    return (
      <div 
        key={item.id} 
        className="content-card"
        style={{
          padding: isCompact ? '12px' : isLarge ? '30px' : '20px',
          fontSize: isCompact ? '0.85rem' : undefined
        }}
      >
        <h3 style={{ fontSize: isCompact ? '1rem' : isLarge ? '1.5rem' : '1.2rem' }}>
          {item.metadata.title || 'Untitled'}
        </h3>
        
        <div className="meta-bar" style={{ fontSize: isCompact ? '0.75rem' : undefined }}>
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
        </div>

        {item.metadata.description && !isCompact && (
          <div className="description">
            {item.metadata.description.length > (isLarge ? 250 : 150)
              ? `${item.metadata.description.substring(0, isLarge ? 250 : 150)}...`
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
            fontSize: isCompact ? '0.8rem' : '0.9rem'
          }}>
            <strong style={{ color: '#2e7d32' }}>Answer:</strong>{' '}
            <span style={{ color: '#1b5e20' }}>{item.metadata.answer}</span>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'cards':
        return (
          <div className="content-grid">
            {filteredContent.map(item => renderCard(item))}
          </div>
        );

      case 'table':
        return (
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
        );

      case 'timeline':
        return (
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {Object.entries(contentByDate)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([date, items]) => (
                <div key={date} style={{ marginBottom: '40px', position: 'relative' }}>
                  <div style={{
                    position: 'sticky',
                    top: '20px',
                    background: '#0066cc',
                    color: '#fff',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    zIndex: 10,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}>
                    <h2 style={{ margin: 0, fontSize: '1.3rem' }}>{date}</h2>
                    <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{
                    paddingLeft: '30px',
                    borderLeft: '3px solid #e0e0e0',
                    position: 'relative'
                  }}>
                    {items.map((item, idx) => (
                      <div key={item.id} style={{
                        marginBottom: '25px',
                        position: 'relative'
                      }}>
                        <div style={{
                          position: 'absolute',
                          left: '-38px',
                          top: '5px',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: '#0066cc',
                          border: '3px solid #fff',
                          boxShadow: '0 0 0 2px #e0e0e0'
                        }} />
                        {renderCard(item)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        );

      case 'grid':
        return (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '15px'
          }}>
            {filteredContent.map(item => renderCard(item, 'compact'))}
          </div>
        );

      case 'compact':
        return (
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            {filteredContent.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  padding: '12px 20px',
                  borderBottom: idx < filteredContent.length - 1 ? '1px solid #eee' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9f9f9'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '0.95rem' }}>
                    {item.metadata.title || 'Untitled'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    {item.metadata.creator && <span>By {item.metadata.creator}</span>}
                    {item.metadata.date && <span>{new Date(item.metadata.date).toLocaleDateString()}</span>}
                    {item.metadata.format && <span>{item.metadata.format}</span>}
                  </div>
                </div>
                {item.metadata.topics && item.metadata.topics.length > 0 && (
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', maxWidth: '200px' }}>
                    {item.metadata.topics.slice(0, 2).map((topic, idx) => (
                      <span key={idx} className="topic-tag-inline">{topic}</span>
                    ))}
                    {item.metadata.topics.length > 2 && (
                      <span className="topic-tag-inline">+{item.metadata.topics.length - 2}</span>
                    )}
                  </div>
                )}
                {item.metadata.answer && (
                  <div style={{
                    padding: '4px 8px',
                    background: '#e8f5e9',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    color: '#2e7d32',
                    fontWeight: '500',
                    maxWidth: '150px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {item.metadata.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case 'magazine':
        const featured = filteredContent.slice(0, 2);
        const regular = filteredContent.slice(2);
        return (
          <div>
            {featured.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: featured.length === 2 ? '1fr 1fr' : '1fr',
                gap: '20px',
                marginBottom: '30px'
              }}>
                {featured.map(item => renderCard(item, 'large'))}
              </div>
            )}
            {regular.length > 0 && (
              <div className="content-grid">
                {regular.map(item => renderCard(item))}
              </div>
            )}
          </div>
        );

      case 'kanban':
        return (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`,
            gap: '20px',
            overflowX: 'auto',
            paddingBottom: '20px'
          }}>
            {Object.entries(contentByTopic).map(([topic, items]) => (
              <div key={topic} style={{
                background: '#f5f5f5',
                borderRadius: '8px',
                padding: '15px',
                minHeight: '200px'
              }}>
                <div style={{
                  background: '#0066cc',
                  color: '#fff',
                  padding: '10px 15px',
                  borderRadius: '6px',
                  marginBottom: '15px',
                  fontWeight: '600',
                  fontSize: '1.1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>{topic}</span>
                  <span style={{
                    background: 'rgba(255,255,255,0.3)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.85rem'
                  }}>
                    {items.length}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {items.map(item => (
                    <div
                      key={item.id}
                      style={{
                        background: '#fff',
                        padding: '12px',
                        borderRadius: '6px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                      }}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>
                        {item.metadata.title || 'Untitled'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '6px' }}>
                        {item.metadata.creator && <span>By {item.metadata.creator}</span>}
                        {item.metadata.date && <span> • {new Date(item.metadata.date).toLocaleDateString()}</span>}
                      </div>
                      {item.metadata.description && (
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#555',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {item.metadata.description}
                        </div>
                      )}
                      {item.metadata.answer && (
                        <div style={{
                          marginTop: '8px',
                          padding: '6px',
                          background: '#e8f5e9',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          color: '#2e7d32',
                          fontWeight: '500'
                        }}>
                          ✓ {item.metadata.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  const viewModes: { mode: ViewMode; label: string; icon: string }[] = [
    { mode: 'cards', label: 'Cards', icon: '🃏' },
    { mode: 'table', label: 'Table', icon: '📊' },
    { mode: 'timeline', label: 'Timeline', icon: '📅' },
    { mode: 'grid', label: 'Grid', icon: '⚏' },
    { mode: 'compact', label: 'Compact', icon: '📋' },
    { mode: 'magazine', label: 'Magazine', icon: '📰' },
    { mode: 'kanban', label: 'Kanban', icon: '📌' }
  ];

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
          <div className="stats">
            <p>
              <strong>{content.length}</strong> total items
              {filteredContent.length !== content.length && (
                <> • <strong>{filteredContent.length}</strong> filtered results</>
              )}
            </p>
          </div>

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
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxWidth: '600px' }}>
                  {viewModes.map(({ mode, label, icon }) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      title={label}
                      style={{
                        padding: '8px 12px',
                        border: '2px solid',
                        borderColor: viewMode === mode ? '#0066cc' : '#ddd',
                        background: viewMode === mode ? '#0066cc' : '#fff',
                        color: viewMode === mode ? '#fff' : '#333',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>{icon}</span>
                      <span>{label}</span>
                    </button>
                  ))}
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
          ) : (
            renderContent()
          )}
        </div>
      </main>
    </div>
  );
}
