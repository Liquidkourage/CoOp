'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/app/components/Navigation';

interface Set {
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

interface Round {
  id: number;
  name: string;
  sequence: number;
}

export default function SetDetailPage() {
  const params = useParams();
  const setId = params.id as string;
  const [set, setSet] = useState<Set | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (setId) {
      fetch(`/api/sets/${setId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setSet(data.set);
            setQuestions(data.questions || []);
            setRounds(data.rounds || []);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [setId]);

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <div>Loading set...</div>
      </div>
    );
  }

  if (!set) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <div>Set not found</div>
        <Link href="/sets">Back to Sets</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <header style={{ marginBottom: '30px' }}>
        <Link href="/sets" style={{ color: '#0066cc', textDecoration: 'none' }}>
          ← Back to Sets
        </Link>
        <h1 style={{ marginTop: '20px' }}>{set.name}</h1>
        {set.description && (
          <p style={{ color: '#666', fontSize: '1.1em' }}>{set.description}</p>
        )}
        <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#888' }}>
          {set.creator && <span>Creator: {set.creator}</span>}
          {set.date && <span style={{ marginLeft: '20px' }}>Date: {new Date(set.date).toLocaleDateString()}</span>}
          {set.topics && set.topics.length > 0 && (
            <div style={{ marginTop: '10px' }}>Topics: {set.topics.join(', ')}</div>
          )}
        </div>
        <Navigation />
      </header>

      {rounds.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ marginBottom: '20px' }}>Rounds ({rounds.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {rounds.map(round => (
              <Link
                key={round.id}
                href={`/rounds/${round.id}`}
                style={{
                  display: 'block',
                  padding: '15px',
                  background: '#f5f5f5',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'inherit'
                }}
              >
                {round.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 style={{ marginBottom: '20px' }}>Questions ({questions.length})</h2>
        {questions.length === 0 && rounds.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            background: '#f9f9f9',
            borderRadius: '8px',
            border: '2px dashed #ddd'
          }}>
            <p>No questions or rounds in this set yet.</p>
          </div>
        ) : questions.length === 0 ? (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            background: '#f9f9f9',
            borderRadius: '8px',
            color: '#666'
          }}>
            <p>No direct questions in this set. Check the rounds above.</p>
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

