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
  explanation: string | null;
  notes: string | null;
  alternateAnswers: string[] | null;
  source: string | null;
  media: string | null;
}

interface Round {
  id: number;
  name: string;
}

interface Set {
  id: number;
  name: string;
  questions: Question[];
  rounds: Round[];
}

export default function SetExportPage() {
  const params = useParams();
  const [set, setSet] = useState<Set | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id as string;
    if (!id) return;

    fetch(`/api/sets/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSet(data.set);
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
    if (!set) return;
    const csv = [
      ['Question', 'Answer', 'Alternate Answers', 'Topics', 'Explanation', 'Notes', 'Source', 'Media'].join(','),
      ...set.questions.map(q => [
        `"${(q.question || '').replace(/"/g, '""')}"`,
        `"${(q.answer || '').replace(/"/g, '""')}"`,
        `"${(q.alternateAnswers?.join(' | ') || '').replace(/"/g, '""')}"`,
        `"${(q.topics?.join('; ') || '').replace(/"/g, '""')}"`,
        `"${(q.explanation || '').replace(/"/g, '""')}"`,
        `"${(q.notes || '').replace(/"/g, '""')}"`,
        `"${(q.source || '').replace(/"/g, '""')}"`,
        `"${(q.media || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');
    downloadFile(csv, `${set.name.replace(/[^a-z0-9]/gi, '_')}-export.csv`, 'text/csv');
  };

  const downloadAsJSON = () => {
    if (!set) return;
    const json = JSON.stringify({
      set: {
        id: set.id,
        name: set.name,
        rounds: set.rounds.map(r => ({ id: r.id, name: r.name })),
        questions: set.questions.map(q => ({
          question: q.question,
          answer: q.answer,
          alternateAnswers: q.alternateAnswers,
          topics: q.topics,
          explanation: q.explanation,
          notes: q.notes,
          source: q.source,
          media: q.media
        }))
      }
    }, null, 2);
    downloadFile(json, `${set.name.replace(/[^a-z0-9]/gi, '_')}-export.json`, 'application/json');
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <Navigation />
        <div>Loading...</div>
      </div>
    );
  }

  if (!set) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <Navigation />
        <div style={{ color: 'red' }}>Set not found</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <Navigation />
      
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Sets', href: '/sets' },
        { label: set.name, href: `/sets/${set.id}` },
        { label: 'Export' }
      ]} />

      <h1>Export Set: {set.name}</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Export {set.questions.length} questions from this set
        {set.rounds.length > 0 && ` (includes ${set.rounds.length} rounds)`}
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
          href={`/sets/${set.id}`}
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
          ← Back to Set
        </Link>
      </div>
    </div>
  );
}

