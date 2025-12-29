'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '../../../components/Navigation';
import { useUser } from '../../../contexts/UserContext';

interface Round {
  id: number;
  name: string;
  creator: string | null;
  date: string | null;
  description: string | null;
  topics: string[] | null;
}

export default function EditRoundPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useUser();
  const [round, setRound] = useState<Round | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    creator: '',
    date: '',
    description: '',
    topics: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = params.id as string;
    if (!id) return;

    fetch(`/api/rounds/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.round) {
          const r = data.round;
          setRound(r);
          setFormData({
            name: r.name || '',
            creator: r.creator || currentUser || '',
            date: r.date || new Date().toISOString().split('T')[0],
            description: r.description || '',
            topics: (r.topics || []).join(', '),
          });
        } else {
          setError(data.error || 'Failed to load round');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load round');
        setLoading(false);
      });
  }, [params.id, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Round name is required');
      return;
    }
    
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/rounds/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          creator: formData.creator.trim() || null,
          date: formData.date || null,
          description: formData.description.trim() || null,
          topics: formData.topics.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/rounds/${params.id}`);
      } else {
        setError(data.error || 'Failed to update round');
      }
    } catch (err) {
      setError('Failed to update round');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        <Navigation />
        <div>Loading round...</div>
      </div>
    );
  }

  if (error && !round) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        <Navigation />
        <div style={{ color: 'red' }}>{error}</div>
        <Link href="/rounds" style={{ display: 'inline-block', marginTop: '20px' }}>
          ← Back to Rounds
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <Navigation />
      
      <div style={{ marginBottom: '30px' }}>
        <Link href={`/rounds/${params.id}`} style={{ color: '#0066cc', textDecoration: 'none' }}>
          ← Back to Round
        </Link>
      </div>

      <h1 style={{ marginBottom: '30px' }}>Edit Round</h1>

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
          />
        </div>

        <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
          <Link
            href={`/rounds/${params.id}`}
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
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

