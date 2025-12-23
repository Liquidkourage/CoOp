'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '../components/Navigation';

export default function SubmitPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    creator: '',
    date: new Date().toISOString().split('T')[0],
    topics: '',
    questionCount: '',
    difficulty: '',
    types: [] as string[],
    question: '',
    answer: '',
    alternateAnswers: '',
    points: '',
    timer: '',
    round: '',
    set: '',
    explanation: '',
    notes: '',
    source: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      if (files.length === 0 && e.target.files[0]) {
        const ext = e.target.files[0].name.split('.').pop()?.toLowerCase();
      }
    }
  };

  const handleTypeToggle = (type: string) => {
    setFormData({
      ...formData,
      types: formData.types.includes(type)
        ? formData.types.filter(t => t !== type)
        : [...formData.types, type]
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.question.trim()) {
      setError('Question text is required');
      return;
    }
    if (!formData.creator.trim()) {
      setError('Creator is required');
      return;
    }
    
    setSubmitting(true);
    setError(null);

    try {
      const formDataToSend = new FormData();
      
      const metadata = {
        // Title removed - not needed for individual questions (only for sets/rounds)
        creator: formData.creator,
        date: formData.date,
        topics: formData.topics.split(',').map(t => t.trim()).filter(Boolean),
        questionCount: formData.questionCount ? parseInt(formData.questionCount) : undefined,
        difficulty: formData.difficulty || undefined,
        types: formData.types,
        question: formData.question.trim(), // Required
        description: formData.question.trim(), // Backward compatibility (database column)
        answer: formData.answer.trim() || undefined,
        alternateAnswers: formData.alternateAnswers.split(',').map(a => a.trim()).filter(Boolean),
        points: formData.points ? parseInt(formData.points) : undefined,
        timer: formData.timer ? parseInt(formData.timer) : undefined,
        round: formData.round.trim() || undefined,
        set: formData.set.trim() || undefined,
        explanation: formData.explanation.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        source: formData.source.trim() || undefined,
      };
      
      formDataToSend.append('metadata', JSON.stringify(metadata));
      
      files.forEach((file) => {
        formDataToSend.append('files', file);
      });

      const response = await fetch('/api/submit', {
        method: 'POST',
        body: formDataToSend,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit content');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit content');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <header className="header">
        <div className="container">
          <h1>Submit Trivia Content</h1>
          <p>Share your trivia content with the community</p>
          <Navigation />
        </div>
      </header>

      <main className="container">
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {success && (
            <div style={{
              background: '#e8f5e9',
              color: '#2e7d32',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              ✓ Content submitted successfully! Redirecting...
            </div>
          )}

          {error && (
            <div className="error">
              Error: {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{
            background: '#fff',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                Creator/Author *
              </label>
              <input
                type="text"
                required
                value={formData.creator}
                onChange={(e) => setFormData({ ...formData, creator: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
                placeholder="Your name or username"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                Date *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                Topics (comma-separated)
              </label>
              <input
                type="text"
                value={formData.topics}
                onChange={(e) => setFormData({ ...formData, topics: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
                placeholder="e.g., science, history, geography"
              />
            </div>


            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                Question Count
              </label>
              <input
                type="number"
                value={formData.questionCount}
                onChange={(e) => setFormData({ ...formData, questionCount: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
                placeholder="e.g., 25"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                Difficulty
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
              >
                <option value="">Select difficulty</option>
                <option value="beginner">Beginner</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>
                Question Types
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {['multiple-choice', 'true-false', 'short-answer', 'fill-in-the-blank', 'matching', 'ordering', 'image-based'].map(type => (
                  <label key={type} style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    padding: '8px 12px',
                    border: formData.types.includes(type) ? '2px solid #0066cc' : '2px solid #ddd',
                    borderRadius: '4px',
                    background: formData.types.includes(type) ? '#e3f2fd' : '#fff'
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.types.includes(type)}
                      onChange={() => handleTypeToggle(type)}
                      style={{ marginRight: '8px' }}
                    />
                    {type.replace('-', ' ')}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                Question *
              </label>
              <textarea
                required
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px',
                  minHeight: '100px',
                  resize: 'vertical'
                }}
                placeholder="Enter your trivia question here..."
              />
              <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                The actual question text. Required for all content.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                Answer
              </label>
              <input
                type="text"
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
                placeholder="The correct answer"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  Points
                </label>
                <input
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '16px'
                  }}
                  placeholder="e.g., 10"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  Time Limit (seconds)
                </label>
                <input
                  type="number"
                  value={formData.timer}
                  onChange={(e) => setFormData({ ...formData, timer: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '16px'
                  }}
                  placeholder="e.g., 30"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  Round
                </label>
                <input
                  type="text"
                  value={formData.round}
                  onChange={(e) => setFormData({ ...formData, round: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '16px'
                  }}
                  placeholder="e.g., Round 1: History"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  Quiz Set/Event
                </label>
                <input
                  type="text"
                  value={formData.set}
                  onChange={(e) => setFormData({ ...formData, set: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '16px'
                  }}
                  placeholder="e.g., December 2025 Quiz Night"
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                Explanation
              </label>
              <textarea
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
                placeholder="Explanation of why the answer is correct..."
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                Host Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
                placeholder="Additional notes for hosts (delivery instructions, context, etc.)..."
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                Alternative Answers (comma-separated)
              </label>
              <input
                type="text"
                value={formData.alternateAnswers}
                onChange={(e) => setFormData({ ...formData, alternateAnswers: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
                placeholder="e.g., Ireland, Republic of Ireland, Eire"
              />
              <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                Acceptable variations of the correct answer (for answer validation flexibility)
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                Source
              </label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
                placeholder="e.g., Wikipedia, BBC News, Original Research"
              />
              <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                Original source of the information (for attribution and fact-checking)
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                Media Files (Images, Audio, Video) *
              </label>
              <input
                type="file"
                multiple
                required
                onChange={handleFileChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
              />
              {files.length > 0 && (
                <div style={{ marginTop: '10px', color: '#666' }}>
                  Selected: {files.map(f => f.name).join(', ')}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '12px 24px',
                  background: submitting ? '#ccc' : '#0066cc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  flex: 1
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Content'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/')}
                style={{
                  padding: '12px 24px',
                  background: '#666',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

