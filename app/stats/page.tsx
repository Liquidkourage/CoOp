'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '../components/Navigation';

interface Stats {
  totals: {
    questions: number;
    rounds: number;
    sets: number;
  };
  topics: Array<{ topic: string; count: number }>;
  creators: Array<{ creator: string; count: number }>;
  difficulty: Array<{ difficulty: string; count: number }>;
  recent: {
    questions: number;
    rounds: number;
    sets: number;
  };
  averages: {
    questionsPerRound: number;
    questionsPerSet: number;
  };
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data.stats);
        } else {
          setError(data.error || 'Failed to load statistics');
        }
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load statistics');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <Navigation />
        <div>Loading statistics...</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <Navigation />
        <div style={{ color: 'red' }}>{error || 'Failed to load statistics'}</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <Navigation />
      
      <header style={{ marginBottom: '30px' }}>
        <h1>Statistics Dashboard</h1>
        <p>Overview of your trivia content repository</p>
      </header>

      {/* Totals */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '20px' }}>Totals</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          <div style={{
            padding: '20px',
            background: '#e3f2fd',
            borderRadius: '8px',
            border: '2px solid #2196f3'
          }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#1976d2', marginBottom: '10px' }}>
              {stats.totals.questions}
            </div>
            <div style={{ fontSize: '16px', color: '#666' }}>Questions</div>
          </div>
          <div style={{
            padding: '20px',
            background: '#f3e5f5',
            borderRadius: '8px',
            border: '2px solid #9c27b0'
          }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#7b1fa2', marginBottom: '10px' }}>
              {stats.totals.rounds}
            </div>
            <div style={{ fontSize: '16px', color: '#666' }}>Rounds</div>
          </div>
          <div style={{
            padding: '20px',
            background: '#e8f5e9',
            borderRadius: '8px',
            border: '2px solid #4caf50'
          }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#388e3c', marginBottom: '10px' }}>
              {stats.totals.sets}
            </div>
            <div style={{ fontSize: '16px', color: '#666' }}>Sets</div>
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '20px' }}>Recent Activity (Last 30 Days)</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          <div style={{
            padding: '15px',
            background: '#fff',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
              {stats.recent.questions}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>New Questions</div>
          </div>
          <div style={{
            padding: '15px',
            background: '#fff',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
              {stats.recent.rounds}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>New Rounds</div>
          </div>
          <div style={{
            padding: '15px',
            background: '#fff',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
              {stats.recent.sets}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>New Sets</div>
          </div>
        </div>
      </section>

      {/* Averages */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '20px' }}>Averages</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px'
        }}>
          <div style={{
            padding: '20px',
            background: '#fff',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
              {stats.averages.questionsPerRound.toFixed(1)}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>Questions per Round</div>
          </div>
          <div style={{
            padding: '20px',
            background: '#fff',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
              {stats.averages.questionsPerSet.toFixed(1)}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>Questions per Set</div>
          </div>
        </div>
      </section>

      {/* Top Topics */}
      {stats.topics.length > 0 && (
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ marginBottom: '20px' }}>Top Topics</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '15px'
          }}>
            {stats.topics.map((item, index) => (
              <div
                key={item.topic}
                style={{
                  padding: '15px',
                  background: '#fff',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '5px' }}>{item.topic}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{item.count} questions</div>
                </div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#0066cc'
                }}>
                  #{index + 1}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Top Creators */}
      {stats.creators.length > 0 && (
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ marginBottom: '20px' }}>Top Creators</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '15px'
          }}>
            {stats.creators.map((item, index) => (
              <div
                key={item.creator}
                style={{
                  padding: '15px',
                  background: '#fff',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '5px' }}>{item.creator}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{item.count} questions</div>
                </div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#0066cc'
                }}>
                  #{index + 1}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Difficulty Distribution */}
      {stats.difficulty.length > 0 && (
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ marginBottom: '20px' }}>Difficulty Distribution</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '15px'
          }}>
            {stats.difficulty.map(item => (
              <div
                key={item.difficulty}
                style={{
                  padding: '15px',
                  background: '#fff',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
                  {item.count}
                </div>
                <div style={{ fontSize: '14px', color: '#666', textTransform: 'capitalize' }}>
                  {item.difficulty}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

