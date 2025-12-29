'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '../../components/Navigation';

interface Question {
  id: number;
  question: string | null;
  answer: string | null;
  points: number | null;
  timer: number | null;
  explanation: string | null;
  notes: string | null;
  alternateAnswers: string[] | null;
  topics: string[] | null;
  difficulty: string | null;
  sequence: number;
}

interface Round {
  id: number;
  name: string;
  creator: string | null;
  date: string | null;
  description: string | null;
  topics: string[] | null;
  questions: Question[];
}

export default function RoundDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [round, setRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = params.id as string;
    if (!id) return;

    fetch(`/api/rounds/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRound(data.round);
        } else {
          setError(data.error || 'Failed to load round');
        }
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load round');
        setLoading(false);
      });
  }, [params.id]);

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <Navigation />
        <div>Loading round...</div>
      </div>
    );
  }

  if (error || !round) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <Navigation />
        <div style={{ color: 'red' }}>{error || 'Round not found'}</div>
        <Link href="/rounds" style={{ display: 'inline-block', marginTop: '20px' }}>
          ← Back to Rounds
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <Navigation />
      
      <div style={{ marginBottom: '30px' }}>
        <Link href="/rounds" style={{ color: '#0066cc', textDecoration: 'none' }}>
          ← Back to Rounds
        </Link>
      </div>

      <header style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid #e0e0e0' }}>
        <h1 style={{ margin: '0 0 10px 0' }}>{round.name}</h1>
        {round.description && (
          <p style={{ fontSize: '18px', color: '#666', margin: '0 0 15px 0' }}>
            {round.description}
          </p>
        )}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '14px', color: '#888' }}>
          {round.creator && <div><strong>Creator:</strong> {round.creator}</div>}
          {round.date && <div><strong>Date:</strong> {new Date(round.date).toLocaleDateString()}</div>}
          {round.topics && round.topics.length > 0 && (
            <div><strong>Topics:</strong> {round.topics.join(', ')}</div>
          )}
          <div><strong>Questions:</strong> {round.questions.length}</div>
        </div>
      </header>

      {round.questions.length === 0 ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: '#f9f9f9',
          borderRadius: '8px',
          border: '2px dashed #ddd'
        }}>
          <p style={{ fontSize: '18px', marginBottom: '10px' }}>No questions in this round</p>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Questions will appear here once they are added to this round.
          </p>
        </div>
      ) : (
        <div>
          <h2 style={{ marginBottom: '20px' }}>Questions ({round.questions.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {round.questions.map((question, index) => (
              <div
                key={question.id}
                style={{
                  padding: '20px',
                  background: '#fff',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                  <div style={{ fontSize: '14px', color: '#888', fontWeight: '600' }}>
                    Question {index + 1}
                    {question.sequence > 0 && ` (Sequence: ${question.sequence})`}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', fontSize: '14px' }}>
                    {question.points !== null && (
                      <span style={{ background: '#e3f2fd', padding: '4px 8px', borderRadius: '4px' }}>
                        {question.points} pts
                      </span>
                    )}
                    {question.timer !== null && (
                      <span style={{ background: '#fff3e0', padding: '4px 8px', borderRadius: '4px' }}>
                        {question.timer}s
                      </span>
                    )}
                    {question.difficulty && (
                      <span style={{ background: '#f3e5f5', padding: '4px 8px', borderRadius: '4px' }}>
                        {question.difficulty}
                      </span>
                    )}
                  </div>
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>
                    {question.question || 'No question text'}
                  </div>
                  {question.answer && (
                    <div style={{ fontSize: '14px', color: '#28a745', fontWeight: '600' }}>
                      Answer: {question.answer}
                    </div>
                  )}
                  {question.alternateAnswers && question.alternateAnswers.length > 0 && (
                    <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                      Alternate Answers: {question.alternateAnswers.join(', ')}
                    </div>
                  )}
                </div>

                {question.explanation && (
                  <div style={{ marginTop: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
                    <strong>Explanation:</strong> {question.explanation}
                  </div>
                )}

                {question.notes && (
                  <div style={{ marginTop: '10px', padding: '10px', background: '#fff3cd', borderRadius: '4px', fontSize: '14px' }}>
                    <strong>Host Notes:</strong> {question.notes}
                  </div>
                )}

                {question.topics && question.topics.length > 0 && (
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#888' }}>
                    Topics: {question.topics.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

