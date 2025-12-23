'use client';

import { useState, useEffect } from 'react';
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
}

export default function RoundsPage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <header style={{ marginBottom: '30px' }}>
        <h1>Rounds</h1>
        <p>Browse rounds - collections of questions</p>
        <Navigation />
      </header>

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
          {rounds.map(round => (
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
              <div style={{ fontSize: '0.85em', color: '#888' }}>
                {round.creator && <div>Creator: {round.creator}</div>}
                {round.date && <div>Date: {new Date(round.date).toLocaleDateString()}</div>}
                {round.topics && round.topics.length > 0 && (
                  <div>Topics: {round.topics.join(', ')}</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

