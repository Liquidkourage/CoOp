'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/app/components/Navigation';

interface Round {
  id: number;
  name: string;
  creator: string | null;
  date: string | null;
  description: string | null;
  topics: string[] | null;
}

interface Question {
  id: number;
  description: string | null;
  answer: string | null;
  sequence: number;
}

export default function RoundDetailPage() {
  const params = useParams();
  const roundId = params.id as string;
  const [round, setRound] = useState<Round | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (roundId) {
      fetch(`/api/rounds/${roundId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setRound(data.round);
            setQuestions(data.questions || []);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [roundId]);

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <div>Loading round...</div>
      </div>
    );
  }

  if (!round) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <div>Round not found</div>
        <Link href="/rounds">Back to Rounds</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <header style={{ marginBottom: '30px' }}>
        <Link href="/rounds" style={{ color: '#0066cc', textDecoration: 'none' }}>
          ← Back to Rounds
        </Link>
        <h1 style={{ marginTop: '20px' }}>{round.name}</h1>
        {round.description && (
          <p style={{ color: '#666', fontSize: '1.1em' }}>{round.description}</p>
        )}
        <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#888' }}>
          {round.creator && <span>Creator: {round.creator}</span>}
          {round.date && <span style={{ marginLeft: '20px' }}>Date: {new Date(round.date).toLocaleDateString()}</span>}
          {round.topics && round.topics.length > 0 && (
            <div style={{ marginTop: '10px' }}>Topics: {round.topics.join(', ')}</div>
          )}
        </div>
        <Navigation />
      </header>

      <div>
        <h2 style={{ marginBottom: '20px' }}>Questions ({questions.length})</h2>
        {questions.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            background: '#f9f9f9',
            borderRadius: '8px',
            border: '2px dashed #ddd'
          }}>
            <p>No questions in this round yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {questions.map((question, idx) => (
              <div
                key={question.id}
                style={{
                  padding: '20px',
                  background: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px'
                }}
              >
                <div style={{ fontSize: '0.85em', color: '#888', marginBottom: '10px' }}>
                  Question {idx + 1}
                </div>
                <div style={{ marginBottom: '10px', fontWeight: '500' }}>
                  {question.description || 'No question text'}
                </div>
                {question.answer && (
                  <div style={{ color: '#666', fontSize: '0.9em' }}>
                    Answer: {question.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

