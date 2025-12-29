'use client';

import { useState, useEffect } from 'react';

interface BulkOperationsProps {
  selectedQuestionIds: number[];
  onClose: () => void;
}

export default function BulkOperations({ selectedQuestionIds, onClose }: BulkOperationsProps) {
  const [rounds, setRounds] = useState<Array<{ id: number; name: string }>>([]);
  const [sets, setSets] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedRound, setSelectedRound] = useState<number | ''>('');
  const [selectedSet, setSelectedSet] = useState<number | ''>('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/rounds').then(r => r.json()),
      fetch('/api/sets').then(r => r.json())
    ]).then(([roundsData, setsData]) => {
      if (roundsData.success) {
        setRounds(roundsData.rounds || []);
      }
      if (setsData.success) {
        setSets(setsData.sets || []);
      }
    }).catch(() => {
      setError('Failed to load rounds and sets');
    });
  }, []);

  const handleAddToRound = async () => {
    if (!selectedRound) return;
    setAdding(true);
    setError(null);
    setSuccess(null);

    try {
      let successCount = 0;
      for (const questionId of selectedQuestionIds) {
        try {
          const response = await fetch(`/api/rounds/${selectedRound}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questionId })
          });
          if (response.ok) successCount++;
        } catch (err) {
          console.error(`Failed to add question ${questionId}:`, err);
        }
      }
      setSuccess(`Added ${successCount} of ${selectedQuestionIds.length} questions to round`);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError('Failed to add questions to round');
    } finally {
      setAdding(false);
    }
  };

  const handleAddToSet = async () => {
    if (!selectedSet) return;
    setAdding(true);
    setError(null);
    setSuccess(null);

    try {
      let successCount = 0;
      for (const questionId of selectedQuestionIds) {
        try {
          const response = await fetch(`/api/sets/${selectedSet}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questionId })
          });
          if (response.ok) successCount++;
        } catch (err) {
          console.error(`Failed to add question ${questionId}:`, err);
        }
      }
      setSuccess(`Added ${successCount} of ${selectedQuestionIds.length} questions to set`);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError('Failed to add questions to set');
    } finally {
      setAdding(false);
    }
  };

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
        maxWidth: '500px',
        width: '100%',
        padding: '30px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
      }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 20px 0' }}>
          Bulk Operations ({selectedQuestionIds.length} questions)
        </h2>

        {error && (
          <div style={{
            padding: '12px',
            background: '#fee',
            color: '#c33',
            borderRadius: '6px',
            marginBottom: '15px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: '12px',
            background: '#efe',
            color: '#3c3',
            borderRadius: '6px',
            marginBottom: '15px',
            fontSize: '14px'
          }}>
            {success}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Add to Round
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select
              value={selectedRound}
              onChange={(e) => setSelectedRound(e.target.value ? parseInt(e.target.value) : '')}
              style={{
                flex: 1,
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                background: '#fff'
              }}
            >
              <option value="">Select a round...</option>
              {rounds.map(round => (
                <option key={round.id} value={round.id}>{round.name}</option>
              ))}
            </select>
            <button
              onClick={handleAddToRound}
              disabled={!selectedRound || adding}
              style={{
                padding: '10px 20px',
                background: !selectedRound || adding ? '#ccc' : '#0066cc',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: !selectedRound || adding ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              {adding ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Add to Set
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select
              value={selectedSet}
              onChange={(e) => setSelectedSet(e.target.value ? parseInt(e.target.value) : '')}
              style={{
                flex: 1,
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                background: '#fff'
              }}
            >
              <option value="">Select a set...</option>
              {sets.map(set => (
                <option key={set.id} value={set.id}>{set.name}</option>
              ))}
            </select>
            <button
              onClick={handleAddToSet}
              disabled={!selectedSet || adding}
              style={{
                padding: '10px 20px',
                background: !selectedSet || adding ? '#ccc' : '#0066cc',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: !selectedSet || adding ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              {adding ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '10px',
            background: '#f0f0f0',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

