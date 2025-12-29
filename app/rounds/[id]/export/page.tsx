'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navigation from '../../../components/Navigation';
import Breadcrumbs from '../../../components/Breadcrumbs';

interface Question {
  id: number;
  question: string | null;
  answer: string | null;
  topics: string[] | null;
  points: number | null;
  timer: number | null;
  explanation: string | null;
  notes: string | null;
  alternateAnswers: string[] | null;
  source: string | null;
}

interface Round {
  id: number;
  name: string;
  questions: Question[];
}

export default function RoundExportPage() {
  const params = useParams();
  const [round, setRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id as string;
    if (!id) return;

    fetch(`/api/rounds/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRound(data.round);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsCSV = () => {
    if (!round) return;
    const csv = [
      ['Question', 'Answer', 'Alternate Answers', 'Topics', 'Points', 'Timer', 'Explanation', 'Notes', 'Source'].join(','),
      ...round.questions.map(q => [
        `"${(q.question || '').replace(/"/g, '""')}"`,
        `"${(q.answer || '').replace(/"/g, '""')}"`,
        `"${(q.alternateAnswers?.join(' | ') || '').replace(/"/g, '""')}"`,
        `"${(q.topics?.join('; ') || '').replace(/"/g, '""')}"`,
        `"${(q.points?.toString() || '')}"`,
        `"${(q.timer?.toString() || '')}"`,
        `"${(q.explanation || '').replace(/"/g, '""')}"`,
        `"${(q.notes || '').replace(/"/g, '""')}"`,
        `"${(q.source || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');
    downloadFile(csv, `${round.name.replace(/[^a-z0-9]/gi, '_')}-export.csv`, 'text/csv');
  };

  const downloadAsJSON = () => {
    if (!round) return;
    const json = JSON.stringify({
      round: {
        id: round.id,
        name: round.name,
        questions: round.questions.map(q => ({
          question: q.question,
          answer: q.answer,
          alternateAnswers: q.alternateAnswers,
          topics: q.topics,
          points: q.points,
          timer: q.timer,
          explanation: q.explanation,
          notes: q.notes,
          source: q.source
        }))
      }
    }, null, 2);
    downloadFile(json, `${round.name.replace(/[^a-z0-9]/gi, '_')}-export.json`, 'application/json');
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <Navigation />
        <div>Loading...</div>
      </div>
    );
  }

  if (!round) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <Navigation />
        <div style={{ color: 'red' }}>Round not found</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <Navigation />
      
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Rounds', href: '/rounds' },
        { label: round.name, href: `/rounds/${round.id}` },
        { label: 'Export' }
      ]} />

      <h1>Export Round: {round.name}</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Export {round.questions.length} questions from this round
      </p>

      <div style={{
        display: 'flex',
        gap: '15px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={downloadAsCSV}
          style={{
            padding: '12px 24px',
            background: '#28a745',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          📥 Download CSV
        </button>
        <button
          onClick={downloadAsJSON}
          style={{
            padding: '12px 24px',
            background: '#0066cc',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          📥 Download JSON
        </button>
        <Link
          href={`/rounds/${round.id}`}
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
          ← Back to Round
        </Link>
      </div>
    </div>
  );
}

