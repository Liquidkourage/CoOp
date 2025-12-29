'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Navigation from '../components/Navigation';

interface Round {
  id: number;
  name: string;
  creator: string | null;
  date: string | null;
  description: string | null;
  topics: string[] | null;
  created_at: string;
  questionCount?: number;
}

export default function RoundsPage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCreator, setSelectedCreator] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'questions'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetch('/api/rounds')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRounds(data.rounds || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Get unique creators and topics for filters
  const creators = useMemo(() => {
    const unique = new Set<string>();
    rounds.forEach(r => {
      if (r.creator) unique.add(r.creator);
    });
    return Array.from(unique).sort();
  }, [rounds]);

  const topics = useMemo(() => {
    const unique = new Set<string>();
    rounds.forEach(r => {
      if (r.topics) {
        r.topics.forEach(t => unique.add(t));
      }
    });
    return Array.from(unique).sort();
  }, [rounds]);

  // Filter and sort rounds
  const filteredRounds = useMemo(() => {
    let filtered = rounds.filter(round => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = round.name.toLowerCase().includes(query);
        const matchesDescription = round.description?.toLowerCase().includes(query);
        const matchesTopics = round.topics?.some(t => t.toLowerCase().includes(query));
        if (!matchesName && !matchesDescription && !matchesTopics) return false;
      }

      // Creator filter
      if (selectedCreator && round.creator !== selectedCreator) return false;

      // Topic filter
      if (selectedTopic && !round.topics?.includes(selectedTopic)) return false;

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'date') {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        comparison = dateA - dateB;
      } else if (sortBy === 'questions') {
        const countA = a.questionCount || 0;
        const countB = b.questionCount || 0;
        comparison = countA - countB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [rounds, searchQuery, selectedCreator, selectedTopic, sortBy, sortOrder]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <header style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1>Rounds</h1>
            <p>Browse rounds - collections of questions</p>
          </div>
          <Link
            href="/rounds/new"
            style={{
              padding: '12px 24px',
              background: '#0066cc',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'inline-block'
            }}
          >
            + Create Round
          </Link>
        </div>
        <Navigation />
      </header>

      {/* Search and Filter Section */}
      <div style={{
        background: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px',
        border: '1px solid #e0e0e0'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, description, or topic..."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>
              Creator
            </label>
            <select
              value={selectedCreator}
              onChange={(e) => setSelectedCreator(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box',
                background: '#fff'
              }}
            >
              <option value="">All Creators</option>
              {creators.map(creator => (
                <option key={creator} value={creator}>{creator}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>
              Topic
            </label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box',
                background: '#fff'
              }}
            >
              <option value="">All Topics</option>
              {topics.map(topic => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>
              Sort By
            </label>
            <div style={{ display: 'flex', gap: '5px' }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'questions')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  background: '#fff'
                }}
              >
                <option value="name">Name</option>
                <option value="date">Date</option>
                <option value="questions">Questions</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
        {(searchQuery || selectedCreator || selectedTopic) && (
          <div style={{ marginTop: '10px' }}>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCreator('');
                setSelectedTopic('');
              }}
              style={{
                padding: '6px 12px',
                background: '#f0f0f0',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Clear Filters
            </button>
            <span style={{ marginLeft: '10px', fontSize: '14px', color: '#666' }}>
              Showing {filteredRounds.length} of {rounds.length} rounds
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div>Loading rounds...</div>
      ) : rounds.length === 0 ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: '#f9f9f9',
          borderRadius: '8px',
          border: '2px dashed #ddd'
        }}>
          <p style={{ fontSize: '18px', marginBottom: '10px' }}>No rounds found</p>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Rounds will appear here once they are created.
            <br />
            Create rounds when importing files or submitting content.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {filteredRounds.map(round => (
            <Link
              key={round.id}
              href={`/rounds/${round.id}`}
              style={{
                display: 'block',
                padding: '20px',
                background: '#fff',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#0066cc';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e0e0e0';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <h3 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>{round.name}</h3>
              {round.description && (
                <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '0.9em' }}>
                  {round.description}
                </p>
              )}
              <div style={{ fontSize: '0.85em', color: '#888', marginBottom: '10px' }}>
                {round.creator && <div>Creator: {round.creator}</div>}
                {round.date && <div>Date: {new Date(round.date).toLocaleDateString()}</div>}
                {round.topics && round.topics.length > 0 && (
                  <div>Topics: {round.topics.join(', ')}</div>
                )}
              </div>
              {round.questionCount !== undefined && (
                <div style={{
                  marginTop: '10px',
                  padding: '6px 12px',
                  background: '#e3f2fd',
                  borderRadius: '4px',
                  fontSize: '0.9em',
                  fontWeight: '600',
                  color: '#1976d2',
                  display: 'inline-block'
                }}>
                  {round.questionCount} {round.questionCount === 1 ? 'question' : 'questions'}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}


