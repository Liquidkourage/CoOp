'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '../../components/Navigation';
import { useUser } from '../../contexts/UserContext';

export default function NewRoundPage() {
  const router = useRouter();
  const { currentUser } = useUser();
  const [formData, setFormData] = useState({
    name: '',
    creator: currentUser || '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    topics: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Round name is required');
      return;
    }
    
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/rounds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          creator: formData.creator.trim() || undefined,
          date: formData.date || undefined,
          description: formData.description.trim() || undefined,
          topics: formData.topics.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/rounds/${data.round.id}`);
      } else {
        setError(data.error || 'Failed to create round');
      }
    } catch (err) {
      setError('Failed to create round');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <Navigation />
      
      <div style={{ marginBottom: '30px' }}>
        <Link href="/rounds" style={{ color: '#0066cc', textDecoration: 'none' }}>
          ← Back to Rounds
        </Link>
      </div>

      <h1 style={{ marginBottom: '30px' }}>Create New Round</h1>

      {error && (
        <div style={{
          padding: '15px',
          background: '#fee',
          color: '#c33',
          borderRadius: '6px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{
        background: '#fff',
        padding: '30px',
        borderRadius: '8px',
        border: '2px solid #e0e0e0'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
            Round Name <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
            placeholder="e.g., Round 1: History"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
            Creator
          </label>
          <input
            type="text"
            value={formData.creator}
            onChange={(e) => setFormData({ ...formData, creator: e.target.value })}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
            placeholder="Your name"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
            Date
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px',
              boxSizing: 'border-box',
              fontFamily: 'inherit'
            }}
            placeholder="Optional description of this round"
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
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
            placeholder="e.g., History, World War II, Europe"
          />
        </div>

        <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
          <Link
            href="/rounds"
            style={{
              padding: '12px 24px',
              background: '#f0f0f0',
              color: '#333',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'inline-block'
            }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '12px 24px',
              background: submitting ? '#ccc' : '#0066cc',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? 'Creating...' : 'Create Round'}
          </button>
        </div>
      </form>
    </div>
  );
}

