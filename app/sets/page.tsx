'use client';

import { useState, useEffect } from 'react';
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
}

export default function SetsPage() {
  const [sets, setSets] = useState<Set[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <header style={{ marginBottom: '30px' }}>
        <h1>Sets</h1>
        <p>Browse sets - collections of questions and/or rounds</p>
        <Navigation />
      </header>

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
          {sets.map(set => (
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
              <div style={{ fontSize: '0.85em', color: '#888' }}>
                {set.creator && <div>Creator: {set.creator}</div>}
                {set.date && <div>Date: {new Date(set.date).toLocaleDateString()}</div>}
                {set.topics && set.topics.length > 0 && (
                  <div>Topics: {set.topics.join(', ')}</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

