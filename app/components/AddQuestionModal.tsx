'use client';

import { useState, useEffect } from 'react';

interface Question {
  id: number;
  question: string | null;
  answer: string | null;
  topics: string[] | null;
  difficulty: string | null;
}

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (questionIds: number[]) => Promise<void>;
  title: string;
}

export default function AddQuestionModal({ isOpen, onClose, onAdd, title }: AddQuestionModalProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadQuestions();
    } else {
      // Reset when modal closes
      setSearchQuery('');
      setSelectedQuestions(new Set());
    }
  }, [isOpen]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      params.append('limit', '100'); // Load more questions for selection

      const response = await fetch(`/api/content?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setQuestions(data.content || []);
      }
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && searchQuery !== undefined) {
      const timeoutId = setTimeout(() => {
        loadQuestions();
      }, 300); // Debounce search
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, isOpen]);

  const toggleQuestion = (questionId: number) => {
    setSelectedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const handleAdd = async () => {
    if (selectedQuestions.size === 0) return;
    setAdding(true);
    try {
      await onAdd(Array.from(selectedQuestions));
      setSelectedQuestions(new Set());
      onClose();
    } catch (err) {
      console.error('Failed to add questions:', err);
      alert('Failed to add questions');
    } finally {
      setAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }} onClick={onClose}>
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
      }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              padding: '0',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '20px', borderBottom: '1px solid #e0e0e0' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions..."
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Question List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading questions...</div>
          ) : questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              {searchQuery ? 'No questions found matching your search' : 'No questions available'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {questions.map(q => (
                <div
                  key={q.id}
                  onClick={() => toggleQuestion(q.id)}
                  style={{
                    padding: '15px',
                    border: selectedQuestions.has(q.id) ? '2px solid #0066cc' : '1px solid #e0e0e0',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: selectedQuestions.has(q.id) ? '#e3f2fd' : '#fff',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'start', gap: '10px' }}>
                    <input
                      type="checkbox"
                      checked={selectedQuestions.has(q.id)}
                      onChange={() => toggleQuestion(q.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ marginTop: '4px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', marginBottom: '5px' }}>
                        {q.question || 'No question text'}
                      </div>
                      {q.answer && (
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                          Answer: {q.answer}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: '#888' }}>
                        {q.topics && q.topics.length > 0 && (
                          <span>Topics: {q.topics.join(', ')}</span>
                        )}
                        {q.difficulty && <span>Difficulty: {q.difficulty}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '14px', color: '#666' }}>
            {selectedQuestions.size} {selectedQuestions.size === 1 ? 'question' : 'questions'} selected
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: '#f0f0f0',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={selectedQuestions.size === 0 || adding}
              style={{
                padding: '10px 20px',
                background: selectedQuestions.size === 0 || adding ? '#ccc' : '#0066cc',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: selectedQuestions.size === 0 || adding ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              {adding ? 'Adding...' : `Add ${selectedQuestions.size} Question${selectedQuestions.size === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

