'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '../../components/Navigation';
import AddQuestionModal from '../../components/AddQuestionModal';
import Breadcrumbs from '../../components/Breadcrumbs';

interface Question {
  id: number;
  question: string | null;
  answer: string | null;
  explanation: string | null;
  notes: string | null;
  alternateAnswers: string[] | null;
  options: string[] | null;
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
  const [showAddModal, setShowAddModal] = useState(false);

  const loadRound = () => {
    const id = params.id as string;
    if (!id) return;

    setLoading(true);
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
  };

  useEffect(() => {
    loadRound();
  }, [params.id]);

  const handleAddQuestions = async (questionIds: number[]) => {
    const id = parseInt(params.id as string, 10);
    if (isNaN(id)) return;

    try {
      // Add each question to the round
      for (const questionId of questionIds) {
        await fetch(`/api/rounds/${id}/questions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ questionId }),
        });
      }
      // Reload round to show new questions
      loadRound();
    } catch (err) {
      throw new Error('Failed to add questions');
    }
  };

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
      
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Rounds', href: '/rounds' },
        { label: round.name }
      ]} />

      <header style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid #e0e0e0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: '0 0 10px 0' }}>{round.name}</h1>
            {round.description && (
              <p style={{ fontSize: '18px', color: '#666', margin: '0 0 15px 0' }}>
                {round.description}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              href={`/rounds/${round.id}/edit`}
              style={{
                padding: '10px 20px',
                background: '#0066cc',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                textDecoration: 'none',
                display: 'inline-block'
              }}
            >
              Edit
            </Link>
            <button
              onClick={async () => {
                if (confirm(`Are you sure you want to delete "${round.name}"? This will remove the round but keep all questions.`)) {
                  try {
                    const response = await fetch(`/api/rounds/${round.id}`, {
                      method: 'DELETE'
                    });
                    const data = await response.json();
                    if (data.success) {
                      window.location.href = '/rounds';
                    } else {
                      alert(data.error || 'Failed to delete round');
                    }
                  } catch (err) {
                    alert('Failed to delete round');
                  }
                }
              }}
              style={{
                padding: '10px 20px',
                background: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Delete
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '14px', color: '#888' }}>
          {round.creator && <div><strong>Creator:</strong> {round.creator}</div>}
          {round.date && <div><strong>Date:</strong> {new Date(round.date).toLocaleDateString()}</div>}
          {round.topics && round.topics.length > 0 && (
            <div><strong>Topics:</strong> {round.topics.join(', ')}</div>
          )}
          <div><strong>Questions:</strong> {round.questions.length}</div>
        </div>
      </header>

      {/* Action Buttons */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '10px 20px',
            background: '#28a745',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          + Add Questions
        </button>
        {round.questions.length > 0 && (
          <Link
            href={`/rounds/${round.id}/export`}
            style={{
              padding: '10px 20px',
              background: '#0066cc',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'inline-block'
            }}
          >
            📥 Export Round
          </Link>
        )}
      </div>

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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontSize: '14px', color: '#888', fontWeight: '600' }}>
                      Question {index + 1}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button
                        onClick={async () => {
                          if (index > 0) {
                            const newSequence = round.questions[index - 1].sequence;
                            try {
                              await fetch(`/api/rounds/${round.id}/questions/${question.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ sequence: newSequence - 1 })
                              });
                              loadRound();
                            } catch (err) {
                              alert('Failed to reorder question');
                            }
                          }
                        }}
                        disabled={index === 0}
                        style={{
                          padding: '4px 8px',
                          background: index === 0 ? '#f0f0f0' : '#0066cc',
                          color: index === 0 ? '#999' : '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: index === 0 ? 'not-allowed' : 'pointer',
                          fontSize: '12px'
                        }}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={async () => {
                          if (index < round.questions.length - 1) {
                            const nextSequence = round.questions[index + 1]?.sequence || round.questions[index].sequence + 1;
                            try {
                              await fetch(`/api/rounds/${round.id}/questions/${question.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ sequence: nextSequence + 1 })
                              });
                              loadRound();
                            } catch (err) {
                              alert('Failed to reorder question');
                            }
                          }
                        }}
                        disabled={index === round.questions.length - 1}
                        style={{
                          padding: '4px 8px',
                          background: index === round.questions.length - 1 ? '#f0f0f0' : '#0066cc',
                          color: index === round.questions.length - 1 ? '#999' : '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: index === round.questions.length - 1 ? 'not-allowed' : 'pointer',
                          fontSize: '12px'
                        }}
                        title="Move down"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '14px' }}>
                      {question.difficulty && (
                        <span style={{ background: '#f3e5f5', padding: '4px 8px', borderRadius: '4px' }}>
                          {question.difficulty}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        if (confirm(`Remove this question from "${round.name}"?`)) {
                          try {
                            const response = await fetch(`/api/rounds/${round.id}/questions/${question.id}`, {
                              method: 'DELETE'
                            });
                            const data = await response.json();
                            if (data.success) {
                              loadRound();
                            } else {
                              alert(data.error || 'Failed to remove question');
                            }
                          } catch (err) {
                            alert('Failed to remove question');
                          }
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        background: '#dc3545',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                      title="Remove from round"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>
                    {question.question || 'No question text'}
                  </div>
                  {/* Multiple Choice Options - Only show if there are multiple options */}
                  {question.options && question.options.length > 0 ? (
                    <div style={{
                      marginTop: '12px',
                      marginBottom: '12px',
                      padding: '15px',
                      background: '#f0f7ff',
                      borderRadius: '8px',
                      border: '2px solid #0066cc'
                    }}>
                      <div style={{ fontWeight: '700', marginBottom: '12px', fontSize: '1rem', color: '#0066cc' }}>
                        Multiple Choice Options:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(() => {
                          // Combine incorrect options with correct answer for display
                          const allOptions = [...question.options];
                          const correctAnswer = question.answer;
                          
                          // If there's a correct answer and it's not already in the options, add it
                          if (correctAnswer && !allOptions.some(opt => opt.toLowerCase().trim() === correctAnswer.toLowerCase().trim())) {
                            allOptions.push(correctAnswer);
                          }
                          
                          return allOptions.map((opt, optIdx) => {
                            const isCorrect = correctAnswer && opt.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
                            return (
                              <div key={optIdx} style={{
                                padding: '8px 12px',
                                background: isCorrect ? '#e8f5e9' : '#fff',
                                borderRadius: '4px',
                                fontSize: '0.95rem',
                                border: isCorrect ? '2px solid #4caf50' : '2px solid #dee2e6',
                                display: 'flex',
                                alignItems: 'center'
                              }}>
                                <span style={{ 
                                  fontWeight: '700', 
                                  color: isCorrect ? '#2e7d32' : '#666', 
                                  marginRight: '10px', 
                                  minWidth: '28px', 
                                  fontSize: '1rem' 
                                }}>
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>
                                <span 
                                  style={{ 
                                    fontWeight: isCorrect ? '600' : '400',
                                    color: isCorrect ? '#2e7d32' : '#333'
                                  }}
                                  dangerouslySetInnerHTML={{ __html: opt }} 
                                />
                                {isCorrect && (
                                  <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: '#666', fontStyle: 'italic' }}>
                                    ✓ Correct Answer
                                  </span>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  ) : question.answer ? (
                    /* Simple answer display for non-multiple-choice questions */
                    <div style={{
                      marginTop: '12px',
                      marginBottom: '12px',
                      padding: '12px',
                      background: '#e8f5e9',
                      borderRadius: '6px',
                      border: '1px solid #4caf50'
                    }}>
                      <strong style={{ color: '#2e7d32', fontSize: '1rem' }}>Answer:</strong>{' '}
                      <span style={{ fontSize: '0.95rem', fontWeight: '500', color: '#1b5e20' }} dangerouslySetInnerHTML={{ __html: question.answer }} />
                    </div>
                  ) : null}
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

      <AddQuestionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddQuestions}
        title={`Add Questions to "${round.name}"`}
      />
    </div>
  );
}

