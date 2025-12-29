'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Navigation from '../components/Navigation';

interface Set {
  id: number;
  name: string;
  creator: string | null;
  date: string | null;
  description: string | null;
  topics: string[] | null;
  created_at: string;
  questionCount?: number;
  roundCount?: number;
}

export default function SetsPage() {
  const [sets, setSets] = useState<Set[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCreator, setSelectedCreator] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'questions' | 'rounds'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetch('/api/sets')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSets(data.sets || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Get unique creators and topics for filters
  const creators = useMemo(() => {
    const unique = new Set<string>();
    sets.forEach(s => {
      if (s.creator) unique.add(s.creator);
    });
    return Array.from(unique).sort();
  }, [sets]);

  const topics = useMemo(() => {
    const unique = new Set<string>();
    sets.forEach(s => {
      if (s.topics) {
        s.topics.forEach(t => unique.add(t));
      }
    });
    return Array.from(unique).sort();
  }, [sets]);

  // Filter and sort sets
  const filteredSets = useMemo(() => {
    let filtered = sets.filter(set => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = set.name.toLowerCase().includes(query);
        const matchesDescription = set.description?.toLowerCase().includes(query);
        const matchesTopics = set.topics?.some(t => t.toLowerCase().includes(query));
        if (!matchesName && !matchesDescription && !matchesTopics) return false;
      }

      // Creator filter
      if (selectedCreator && set.creator !== selectedCreator) return false;

      // Topic filter
      if (selectedTopic && !set.topics?.includes(selectedTopic)) return false;

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
      } else if (sortBy === 'rounds') {
        const countA = a.roundCount || 0;
        const countB = b.roundCount || 0;
        comparison = countA - countB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [sets, searchQuery, selectedCreator, selectedTopic, sortBy, sortOrder]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <header style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1>Sets</h1>
            <p>Browse sets - collections of questions and/or rounds</p>
          </div>
          <Link
            href="/sets/new"
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
            + Create Set
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
                onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'questions' | 'rounds')}
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
                <option value="rounds">Rounds</option>
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
              Showing {filteredSets.length} of {sets.length} sets
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div>Loading sets...</div>
      ) : sets.length === 0 ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: '#f9f9f9',
          borderRadius: '8px',
          border: '2px dashed #ddd'
        }}>
          <p style={{ fontSize: '18px', marginBottom: '10px' }}>No sets found</p>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Sets will appear here once they are created.
            <br />
            Create sets when importing files or submitting content.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {filteredSets.map(set => (
            <Link
              key={set.id}
              href={`/sets/${set.id}`}
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
              <h3 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>{set.name}</h3>
              {set.description && (
                <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '0.9em' }}>
                  {set.description}
                </p>
              )}
              <div style={{ fontSize: '0.85em', color: '#888', marginBottom: '10px' }}>
                {set.creator && <div>Creator: {set.creator}</div>}
                {set.date && <div>Date: {new Date(set.date).toLocaleDateString()}</div>}
                {set.topics && set.topics.length > 0 && (
                  <div>Topics: {set.topics.join(', ')}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {set.roundCount !== undefined && set.roundCount > 0 && (
                  <div style={{
                    padding: '6px 12px',
                    background: '#f3e5f5',
                    borderRadius: '4px',
                    fontSize: '0.9em',
                    fontWeight: '600',
                    color: '#7b1fa2',
                    display: 'inline-block'
                  }}>
                    {set.roundCount} {set.roundCount === 1 ? 'round' : 'rounds'}
                  </div>
                )}
                {set.questionCount !== undefined && (
                  <div style={{
                    padding: '6px 12px',
                    background: '#e3f2fd',
                    borderRadius: '4px',
                    fontSize: '0.9em',
                    fontWeight: '600',
                    color: '#1976d2',
                    display: 'inline-block'
                  }}>
                    {set.questionCount} {set.questionCount === 1 ? 'question' : 'questions'}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}


