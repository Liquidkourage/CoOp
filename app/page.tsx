'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ContentItem } from '@/lib/content';

interface ContentResponse {
  success: boolean;
  count: number;
  content: ContentItem[];
}

interface TopicsResponse {
  success: boolean;
  topics: string[];
}

interface CreatorsResponse {
  success: boolean;
  creators: string[];
}

export default function Home() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [creators, setCreators] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedCreator, setSelectedCreator] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterContent();
  }, [content, searchQuery, selectedTopic, selectedCreator, selectedDifficulty, selectedFormat]);

  async function loadData() {
    try {
      setLoading(true);
      
      const contentRes = await fetch('/api/content');
      const contentData: ContentResponse = await contentRes.json();
      
      if (!contentData.success) {
        throw new Error('Failed to load content');
      }
      
      setContent(contentData.content);
      setFilteredContent(contentData.content);
      
      const topicsRes = await fetch('/api/topics');
      const topicsData: TopicsResponse = await topicsRes.json();
      if (topicsData.success) {
        setTopics(topicsData.topics);
      }
      
      const creatorsRes = await fetch('/api/creators');
      const creatorsData: CreatorsResponse = await creatorsRes.json();
      if (creatorsData.success) {
        setCreators(creatorsData.creators);
      }
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function filterContent() {
    if (!content.length) return;
    
    try {
      const params = new URLSearchParams();
      if (selectedTopic) params.append('topics', selectedTopic);
      if (selectedCreator) params.append('creator', selectedCreator);
      if (selectedDifficulty) params.append('difficulty', selectedDifficulty);
      if (selectedFormat) params.append('format', selectedFormat);
      
      let results = content;
      
      if (params.toString()) {
        const res = await fetch(`/api/content?${params}`);
        const data: ContentResponse = await res.json();
        if (data.success) {
          results = data.content;
        }
      }
      
      if (searchQuery) {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const searchData = await res.json();
        if (searchData.success) {
          const searchIds = new Set(searchData.results.map((item: ContentItem) => item.id));
          results = results.filter(item => searchIds.has(item.id));
        }
      }
      
      setFilteredContent(results);
    } catch (err) {
      console.error('Error filtering content:', err);
    }
  }

  function clearFilters() {
    setSearchQuery('');
    setSelectedTopic('');
    setSelectedCreator('');
    setSelectedDifficulty('');
    setSelectedFormat('');
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    setDeleting(id);
    try {
      const response = await fetch(`/api/delete?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete');
      }

      // Remove from local state
      setContent(content.filter(item => item.id !== id));
      setFilteredContent(filteredContent.filter(item => item.id !== id));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete item');
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <p>Loading content...</p>
      </div>
    );
  }

  return (
    <div>
      <header className="header">
        <div className="container">
          <h1>Trivia Content Repository</h1>
          <p>A collaborative repository for trivia content creators</p>
          <nav style={{ marginTop: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <Link href="/" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>Home</Link>
            <Link href="/submit" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>Submit Content</Link>
            <Link href="/import" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>Import CSV</Link>
            <Link href="/configure-trivnow" style={{ color: '#ff6600', textDecoration: 'none', fontWeight: '600' }}>⚙️ Configure TrivNow</Link>
            <a href="/api/content" target="_blank" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>API: Content</a>
            <a href="/api/topics" target="_blank" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>API: Topics</a>
            <a href="/api/creators" target="_blank" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>API: Creators</a>
            <a href="/api/search?q=test" target="_blank" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>API: Search</a>
            <a href="/api/db-init" target="_blank" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: '500' }}>DB Init</a>
          </nav>
        </div>
      </header>

      <main className="container">
        <div style={{ marginBottom: '20px', textAlign: 'right' }}>
          <a
            href="/submit"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: '#0066cc',
              color: '#fff',
              borderRadius: '4px',
              textDecoration: 'none',
              fontWeight: '600',
              marginRight: '10px'
            }}
          >
            + Submit Content
          </a>
          <a
            href="/import"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: '#28a745',
              color: '#fff',
              borderRadius: '4px',
              textDecoration: 'none',
              fontWeight: '600',
              marginRight: '10px'
            }}
          >
            📥 Import CSV
          </a>
          <Link
            href="/configure-trivnow"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: '#ff6600',
              color: '#fff',
              borderRadius: '4px',
              textDecoration: 'none',
              fontWeight: '600'
            }}
          >
            ⚙️ Configure TrivNow Schema
          </Link>
        </div>

        {error && (
          <div className="error">
            Error: {error}
          </div>
        )}

        <div className="stats">
          <p>Found {filteredContent.length} content item{filteredContent.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by title, creator, topic, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filters">
          <div className="filter-group">
            <label>Topic</label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
            >
              <option value="">All Topics</option>
              {topics.map(topic => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Creator</label>
            <select
              value={selectedCreator}
              onChange={(e) => setSelectedCreator(e.target.value)}
            >
              <option value="">All Creators</option>
              {creators.map(creator => (
                <option key={creator} value={creator}>{creator}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Difficulty</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
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
            >
              <option value="">All Formats</option>
              <option value="pdf">PDF</option>
              <option value="xlsx">Excel</option>
              <option value="pptx">PowerPoint</option>
              <option value="txt">Text</option>
              <option value="json">JSON</option>
              <option value="image">Image</option>
            </select>
          </div>

          {(selectedTopic || selectedCreator || selectedDifficulty || selectedFormat || searchQuery) && (
            <div className="filter-group" style={{ justifyContent: 'flex-end' }}>
              <button
                onClick={clearFilters}
                style={{
                  padding: '8px 16px',
                  background: '#666',
                  color: '#fff',
                  border: 'none',
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

        {filteredContent.length === 0 ? (
          <div className="loading">
            <p>No content found. Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="content-table-container">
            <table className="content-table">
              <thead>
                <tr>
                  <th>Question/Content</th>
                  <th>Answer</th>
                  <th>Category</th>
                  <th>Format</th>
                  <th>Creator</th>
                  <th>Date</th>
                  {filteredContent.some(item => item.files.length > 0) && <th>Files</th>}
                  <th style={{ width: '80px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContent.map((item) => {
                  const title = item.metadata.title || '';
                  const description = item.metadata.description || '';
                  const displayText = description || title || 'Untitled';
                  const answer = item.metadata.correctAnswer || item.metadata.answer || '';
                  
                  return (
                    <tr key={item.id}>
                      <td className="question-cell">
                        <div className="question-text" title={displayText}>
                          {displayText.length > 150 ? `${displayText.substring(0, 150)}...` : displayText}
                        </div>
                      </td>
                      <td className="answer-cell">
                        {answer ? (
                          <div className="answer-text" title={answer}>
                            {answer.length > 100 ? `${answer.substring(0, 100)}...` : answer}
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {item.metadata.topics && item.metadata.topics.length > 0 ? (
                          <div className="topics-list">
                            {item.metadata.topics.map(topic => (
                              <span key={topic} className="topic-tag">{topic}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>{item.metadata.format || <span className="text-muted">—</span>}</td>
                      <td>{item.metadata.creator || <span className="text-muted">—</span>}</td>
                      <td>
                        {item.metadata.date ? (
                          new Date(item.metadata.date).toLocaleDateString()
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      {filteredContent.some(item => item.files.length > 0) && (
                        <td>
                          {item.files.length > 0 ? (
                            <div className="files-list">
                              {item.files.map((file, idx) => {
                                const fileName = file.split('/').pop() || file;
                                const filePath = file.startsWith('/') ? file.slice(1) : file;
                                return (
                                  <a
                                    key={idx}
                                    href={`/api/files/${filePath}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="file-link"
                                  >
                                    📄
                                  </a>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      )}
                      <td>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deleting === item.id}
                          className="delete-btn"
                          title="Delete this item"
                        >
                          {deleting === item.id ? '...' : '🗑️'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

