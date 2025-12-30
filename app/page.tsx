'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Navigation from './components/Navigation';
import { useUser } from './contexts/UserContext';
import BulkOperations from './components/BulkOperations';

interface ContentItem {
  id: string;
  path: string;
  metadata: {
    title?: string; // Deprecated: not needed for individual questions
    creator?: string;
    date?: string;
    topics?: string[];
    questionCount?: number;
    difficulty?: string;
    types?: string[];
    question?: string;
    description?: string; // Deprecated: use 'question' instead. Kept for backward compatibility.
    answer?: string;
    alternateAnswers?: string[]; // Alternative acceptable answers
    options?: string[]; // For multiple-choice questions: array of all answer options
    points?: number;
    timer?: number;
    round?: string; // Deprecated - use rounds array instead
    set?: string; // Deprecated - use sets array instead
    rounds?: Array<{ id: number; name: string; sequence: number }>;
    sets?: Array<{ id: number; name: string; sequence: number }>;
    explanation?: string;
    notes?: string; // Host notes
    source?: string; // URL/web resource that verifies question accuracy
    tags?: string[];
    files?: string[]; // Media files
  };
  files: string[];
}

interface ContentResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  content: ContentItem[];
  error?: string;
}

type ViewMode = 'search' | 'browse' | 'stats' | 'topics' | 'creators' | 
                'qa-pairs' | 'quiz-format' | 'spreadsheet' | 'plain-text' | 
                'flashcards' | 'bulk-copy' | 'document' | 'structured';

export default function HomePage() {
  const { currentUser, setCurrentUser } = useUser();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedCreator, setSelectedCreator] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('search');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showAnswers, setShowAnswers] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const limit = 50;

  useEffect(() => {
    fetch('/api/content?limit=1')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTotalCount(data.total || 0);
        }
      })
      .catch(() => {});
  }, []);

  const loadContent = async (pageNum: number = 1, reset: boolean = false) => {
    setLoading(true);
    setError(null);
    
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.append('search', searchQuery.trim());
    if (selectedTopic) params.append('topics', selectedTopic);
    if (selectedCreator) params.append('creator', selectedCreator);
    if (selectedDifficulty) params.append('difficulty', selectedDifficulty);
    params.append('page', pageNum.toString());
    params.append('limit', limit.toString());

    try {
      const response = await fetch(`/api/content?${params.toString()}`);
      const data: ContentResponse = await response.json();
      
      if (data.success) {
        if (reset) {
          setContent(data.content);
        } else {
          setContent(prev => [...prev, ...data.content]);
        }
        setTotalPages(data.totalPages);
        setTotalCount(data.total);
        setPage(pageNum);
      } else {
        setError(data.error || 'Failed to load content');
      }
    } catch (err) {
      setError('Failed to load content. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [allTopics, setAllTopics] = useState<string[]>([]);
  const [allCreators, setAllCreators] = useState<string[]>([]);

  useEffect(() => {
    const loadTopicsAndCreators = async () => {
      try {
        const topicsResponse = await fetch('/api/topics');
        const topicsData = await topicsResponse.json();
        console.log('Topics API response:', topicsData);
        
        if (topicsData.success) {
          const topics = topicsData.topics || [];
          console.log('Setting topics:', topics);
          setAllTopics(topics);
        } else {
          console.error('Failed to load topics:', topicsData.error);
        }
      } catch (error) {
        console.error('Error fetching topics:', error);
      }

      try {
        const creatorsResponse = await fetch('/api/creators');
        const creatorsData = await creatorsResponse.json();
        console.log('Creators API response:', creatorsData);
        
        if (creatorsData.success) {
          const creators = creatorsData.creators || [];
          console.log('Setting creators:', creators);
          setAllCreators(creators);
        } else {
          console.error('Failed to load creators:', creatorsData.error);
        }
      } catch (error) {
        console.error('Error fetching creators:', error);
      }
    };

    loadTopicsAndCreators();
  }, []);

  const handleSearch = () => {
    setPage(1);
    setSelectedItems(new Set());
    loadContent(1, true);
  };

  useEffect(() => {
    if (viewMode === 'browse' && content.length === 0) {
      loadContent(1, true);
    }
  }, [viewMode]);

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedItems(new Set(content.map(item => item.id)));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

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
    const itemsToShow = selectedItems.size > 0 ? getSelectedContent() : content;
    const csv = [
      ['Question', 'Answer', 'Alternate Answers', 'Options', 'Topics', 'Creator', 'Date', 'Points', 'Timer', 'Rounds', 'Sets', 'Explanation', 'Notes', 'Source'].join(','),
      ...itemsToShow.map(item => {
        // Use rounds/sets arrays if available, fallback to legacy round/set TEXT
        const rounds = item.metadata.rounds?.map(r => r.name).join(' | ') || item.metadata.round || '';
        const sets = item.metadata.sets?.map(s => s.name).join(' | ') || item.metadata.set || '';
        return [
          `"${((item.metadata.question || item.metadata.description || '').replace(/"/g, '""'))}"`,
          `"${((item.metadata.answer || '').replace(/"/g, '""'))}"`,
          `"${((item.metadata.alternateAnswers?.join(' | ') || '').replace(/"/g, '""'))}"`,
          `"${((item.metadata.options?.join(' | ') || '').replace(/"/g, '""'))}"`,
          `"${((item.metadata.topics?.join('; ') || '').replace(/"/g, '""'))}"`,
          `"${((item.metadata.creator || '').replace(/"/g, '""'))}"`,
          `"${((item.metadata.date || '').replace(/"/g, '""'))}"`,
          `"${((item.metadata.points?.toString() || '').replace(/"/g, '""'))}"`,
          `"${((item.metadata.timer?.toString() || '').replace(/"/g, '""'))}"`,
          `"${(rounds.replace(/"/g, '""'))}"`,
          `"${(sets.replace(/"/g, '""'))}"`,
          `"${((item.metadata.explanation || '').replace(/"/g, '""'))}"`,
          `"${((item.metadata.notes || '').replace(/"/g, '""'))}"`,
          `"${((item.metadata.source || '').replace(/"/g, '""'))}"`
        ].join(',');
      })
    ].join('\n');
    downloadFile(csv, `trivia-export-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  };

  const downloadAsExcel = async () => {
    const itemsToShow = selectedItems.size > 0 ? getSelectedContent() : content;
    // For Excel, we'll use TSV format (can be opened in Excel)
    const tsv = [
      ['Question', 'Answer', 'Alternate Answers', 'Options', 'Topics', 'Creator', 'Date', 'Points', 'Timer', 'Rounds', 'Sets', 'Explanation', 'Notes', 'Source'].join('\t'),
      ...itemsToShow.map(item => {
        // Use rounds/sets arrays if available, fallback to legacy round/set TEXT
        const rounds = item.metadata.rounds?.map(r => r.name).join(' | ') || item.metadata.round || '';
        const sets = item.metadata.sets?.map(s => s.name).join(' | ') || item.metadata.set || '';
        return [
          (item.metadata.question || item.metadata.description || '').replace(/\t/g, ' '),
          (item.metadata.answer || '').replace(/\t/g, ' '),
          (item.metadata.alternateAnswers?.join(' | ') || '').replace(/\t/g, ' '),
          (item.metadata.options?.join(' | ') || '').replace(/\t/g, ' '),
          (item.metadata.topics?.join('; ') || '').replace(/\t/g, ' '),
          (item.metadata.creator || '').replace(/\t/g, ' '),
          (item.metadata.date || '').replace(/\t/g, ' '),
          (item.metadata.points?.toString() || '').replace(/\t/g, ' '),
          (item.metadata.timer?.toString() || '').replace(/\t/g, ' '),
          rounds.replace(/\t/g, ' '),
          sets.replace(/\t/g, ' '),
          (item.metadata.explanation || '').replace(/\t/g, ' '),
          (item.metadata.notes || '').replace(/\t/g, ' '),
          (item.metadata.source || '').replace(/\t/g, ' ')
        ].join('\t');
      })
    ].join('\n');
    downloadFile(tsv, `trivia-export-${new Date().toISOString().split('T')[0]}.xls`, 'application/vnd.ms-excel');
  };

  const downloadAsJSON = () => {
    const itemsToShow = selectedItems.size > 0 ? getSelectedContent() : content;
    const json = JSON.stringify(itemsToShow.map(item => ({
      question: item.metadata.question || item.metadata.description,
      answer: item.metadata.answer,
      alternateAnswers: item.metadata.alternateAnswers,
      options: item.metadata.options,
      topics: item.metadata.topics,
      creator: item.metadata.creator,
      date: item.metadata.date,
      points: item.metadata.points,
      timer: item.metadata.timer,
      rounds: item.metadata.rounds?.map(r => ({ id: r.id, name: r.name })) || (item.metadata.round ? [{ name: item.metadata.round }] : []),
      sets: item.metadata.sets?.map(s => ({ id: s.id, name: s.name })) || (item.metadata.set ? [{ name: item.metadata.set }] : []),
      round: item.metadata.round, // Deprecated - kept for backward compatibility
      set: item.metadata.set, // Deprecated - kept for backward compatibility
      explanation: item.metadata.explanation,
      notes: item.metadata.notes,
      source: item.metadata.source,
      difficulty: item.metadata.difficulty,
      types: item.metadata.types,
      tags: item.metadata.tags,
      files: item.files || []
    })), null, 2);
    downloadFile(json, `trivia-export-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy. Please select and copy manually.');
    });
  };

  const getSelectedContent = () => {
    return content.filter(item => selectedItems.has(item.id));
  };

  // Helper function to format options for display
  const formatOptions = (options?: string[]): string => {
    if (!options || options.length === 0) return '';
    return options.map((opt, idx) => `${String.fromCharCode(65 + idx)}. ${opt}`).join('\n');
  };

  const renderQAPairs = () => {
    const itemsToShow = selectedItems.size > 0 ? getSelectedContent() : content;
    const text = itemsToShow.map((item, idx) => {
      const q = item.metadata.question || item.metadata.description || 'No question';
      const optionsText = item.metadata.options && item.metadata.options.length > 0 
        ? '\nOptions:\n' + formatOptions(item.metadata.options) 
        : '';
      const a = item.metadata.answer || 'No answer provided';
      return `Q${idx + 1}: ${q}${optionsText}\nA${idx + 1}: ${a}\n`;
    }).join('\n');
    
    return (
      <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Question-Answer Pairs</h2>
          <button
            onClick={() => copyToClipboard(text)}
            style={{
              padding: '10px 20px',
              background: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            📋 Copy All
          </button>
        </div>
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '6px',
          fontFamily: 'monospace',
          fontSize: '14px',
          lineHeight: '1.8',
          whiteSpace: 'pre-wrap',
          border: '1px solid #dee2e6',
          maxHeight: '600px',
          overflow: 'auto'
        }}>
          {itemsToShow.map((item, idx) => (
            <div key={item.id} style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: idx < itemsToShow.length - 1 ? '1px solid #dee2e6' : 'none' }}>
              <div style={{ fontWeight: 'bold', color: '#0066cc', marginBottom: '8px' }}>
                Q{idx + 1}: {item.metadata.question || item.metadata.description || item.metadata.title || 'No question'}
              </div>
              {item.metadata.options && item.metadata.options.length > 0 && (
                <div style={{ marginLeft: '20px', marginTop: '8px', marginBottom: '8px', color: '#666', fontSize: '13px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>Options:</div>
                  {item.metadata.options.map((opt, optIdx) => (
                    <div key={optIdx} style={{ marginLeft: '10px' }}>
                      {String.fromCharCode(65 + optIdx)}. {opt}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ color: '#28a745', marginLeft: '20px' }}>
                A{idx + 1}: {item.metadata.answer || 'No answer provided'}
              </div>
              {item.metadata.topics && item.metadata.topics.length > 0 && (
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px', marginLeft: '20px' }}>
                  Topics: {item.metadata.topics.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderQuizFormat = () => {
    const itemsToShow = selectedItems.size > 0 ? getSelectedContent() : content;
    const text = itemsToShow.map((item, idx) => {
      const q = item.metadata.question || item.metadata.description || 'No question';
      const optionsText = item.metadata.options && item.metadata.options.length > 0 
        ? '\n   ' + formatOptions(item.metadata.options).replace(/\n/g, '\n   ')
        : '';
      const a = item.metadata.answer || 'No answer provided';
      return `${idx + 1}. ${q}${optionsText}\n   Answer: ${a}\n`;
    }).join('\n');
    
    return (
      <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Quiz Format</h2>
          <button
            onClick={() => copyToClipboard(text)}
            style={{
              padding: '10px 20px',
              background: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            📋 Copy All
          </button>
        </div>
        <div style={{
          background: '#fff',
          padding: '30px',
          borderRadius: '6px',
          fontFamily: 'Georgia, serif',
          fontSize: '16px',
          lineHeight: '2',
          border: '2px solid #333',
          maxHeight: '600px',
          overflow: 'auto'
        }}>
          {itemsToShow.map((item, idx) => (
            <div key={item.id} style={{ marginBottom: '25px' }}>
              <div style={{ fontWeight: '600', marginBottom: '10px' }}>
                {idx + 1}. {item.metadata.question || item.metadata.description || item.metadata.title || 'No question'}
              </div>
              {item.metadata.options && item.metadata.options.length > 0 && (
                <div style={{ marginLeft: '30px', marginTop: '8px', marginBottom: '10px', color: '#666' }}>
                  {item.metadata.options.map((opt, optIdx) => (
                    <div key={optIdx} style={{ marginBottom: '4px' }}>
                      {String.fromCharCode(65 + optIdx)}. {opt}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginLeft: '30px', color: '#555', fontStyle: 'italic' }}>
                Answer: {item.metadata.answer || 'No answer provided'}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSpreadsheet = () => {
    const itemsToShow = selectedItems.size > 0 ? getSelectedContent() : content;
    const csv = [
      ['Question', 'Options', 'Answer', 'Topic', 'Creator', 'Date'].join('\t'),
      ...itemsToShow.map(item => [
        (item.metadata.question || item.metadata.description || '').replace(/\t/g, ' '),
        (item.metadata.options?.join(' | ') || '').replace(/\t/g, ' '),
        (item.metadata.answer || '').replace(/\t/g, ' '),
        (item.metadata.topics?.join('; ') || '').replace(/\t/g, ' '),
        (item.metadata.creator || '').replace(/\t/g, ' '),
        (item.metadata.date || '').replace(/\t/g, ' ')
      ].join('\t'))
    ].join('\n');
    
    return (
      <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Spreadsheet View (Tab-Separated)</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => copyToClipboard(csv)}
              style={{
                padding: '10px 20px',
                background: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              📋 Copy All
            </button>
            <button
              onClick={downloadAsExcel}
              style={{
                padding: '10px 20px',
                background: '#0066cc',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              💾 Download Excel
            </button>
          </div>
        </div>
        <div style={{
          background: '#f8f9fa',
          padding: '15px',
          borderRadius: '6px',
          fontFamily: 'monospace',
          fontSize: '13px',
          overflowX: 'auto',
          border: '1px solid #dee2e6'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
            <thead>
              <tr style={{ background: '#e9ecef', fontWeight: '600' }}>
                <th style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'left' }}>Question</th>
                <th style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'left' }}>Answer</th>
                <th style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'left' }}>Topic</th>
                <th style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'left' }}>Creator</th>
                <th style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'left' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {itemsToShow.map((item, idx) => (
                <tr key={item.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                  <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>{item.metadata.question || item.metadata.description || '-'}</td>
                  <td style={{ padding: '10px', border: '1px solid #dee2e6', color: '#28a745', fontWeight: '500' }}>{item.metadata.answer || '-'}</td>
                  <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>{item.metadata.topics?.join(', ') || '-'}</td>
                  <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>{item.metadata.creator || '-'}</td>
                  <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>{item.metadata.date || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPlainText = () => {
    const itemsToShow = selectedItems.size > 0 ? getSelectedContent() : content;
    const text = itemsToShow.map((item, idx) => {
      let output = `--- Question ${idx + 1} ---\n`;
      output += `Question: ${item.metadata.question || item.metadata.description || item.metadata.title || 'No question'}\n`;
      output += `Answer: ${item.metadata.answer || 'No answer provided'}\n`;
      if (item.metadata.topics?.length) output += `Topics: ${item.metadata.topics.join(', ')}\n`;
      if (item.metadata.creator) output += `Creator: ${item.metadata.creator}\n`;
      if (item.metadata.date) output += `Date: ${item.metadata.date}\n`;
      return output;
    }).join('\n');
    
    return (
      <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Plain Text Export</h2>
          <button
            onClick={() => copyToClipboard(text)}
            style={{
              padding: '10px 20px',
              background: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            📋 Copy All
          </button>
        </div>
        <textarea
          readOnly
          value={text}
          style={{
            width: '100%',
            minHeight: '500px',
            padding: '15px',
            fontFamily: 'monospace',
            fontSize: '13px',
            lineHeight: '1.6',
            border: '2px solid #dee2e6',
            borderRadius: '6px',
            background: '#f8f9fa',
            resize: 'vertical'
          }}
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
        />
      </div>
    );
  };

  const toggleFlip = (id: string) => {
      setFlippedCards(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    };

  const renderFlashcards = () => {
    const itemsToShow = selectedItems.size > 0 ? getSelectedContent() : content;
    
    const handleToggleFlip = (id: string) => {
      setFlippedCards(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    };

    return (
      <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Flashcard View</h2>
          <div>
            <button
              onClick={() => setShowAnswers(!showAnswers)}
              style={{
                padding: '8px 16px',
                marginRight: '10px',
                background: showAnswers ? '#28a745' : '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {showAnswers ? 'Hide' : 'Show'} All Answers
            </button>
            <button
              onClick={() => {
                const text = itemsToShow.map(item => 
                  `${item.metadata.question || item.metadata.description || item.metadata.title || 'No question'}\n${item.metadata.answer || 'No answer'}`
                ).join('\n\n---\n\n');
                copyToClipboard(text);
              }}
              style={{
                padding: '8px 16px',
                background: '#0066cc',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📋 Copy All
            </button>
          </div>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {itemsToShow.map((item) => {
            const isFlipped = flippedCards.has(item.id) || showAnswers;
            return (
              <div
                key={item.id}
                onClick={() => handleToggleFlip(item.id)}
                style={{
                  aspectRatio: '1.5',
                  perspective: '1000px',
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.6s',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}>
                  <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backfaceVisibility: 'hidden',
                    background: '#0066cc',
                    color: '#fff',
                    padding: '20px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                    fontSize: '18px',
                    fontWeight: '500'
                  }}>
                    {item.metadata.question || item.metadata.description || item.metadata.title || 'No question'}
                  </div>
                  <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    background: '#28a745',
                    color: '#fff',
                    padding: '20px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                    fontSize: '18px',
                    fontWeight: '500'
                  }}>
                    {item.metadata.answer || 'No answer provided'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ marginTop: '20px', color: '#666', fontSize: '14px', textAlign: 'center' }}>
          Click a card to flip it, or use "Show All Answers" to reveal all at once
        </p>
      </div>
    );
  };

  const [showBulkOps, setShowBulkOps] = useState(false);

  const renderBulkCopy = () => {
    const selectedContent = getSelectedContent();
    const selectedIds = selectedContent.map(item => parseInt(item.id)).filter(id => !isNaN(id));

    return (
      <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Bulk Copy Mode</h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={selectAll}
              style={{
                padding: '8px 16px',
                background: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              style={{
                padding: '8px 16px',
                background: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Deselect All
            </button>
            {selectedItems.size > 0 && (
              <button
                onClick={() => setShowBulkOps(true)}
                style={{
                  padding: '8px 16px',
                  background: '#0066cc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                ➕ Add to Round/Set ({selectedItems.size})
              </button>
            )}
            <button
              onClick={() => {
                const selected = getSelectedContent();
                const text = selected.map(item => 
                  `${item.metadata.question || item.metadata.description || item.metadata.title || 'No question'}\nAnswer: ${item.metadata.answer || 'No answer'}\n`
                ).join('\n---\n\n');
                copyToClipboard(text);
              }}
              disabled={selectedItems.size === 0}
              style={{
                padding: '8px 16px',
                background: selectedItems.size === 0 ? '#ccc' : '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: selectedItems.size === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              📋 Copy Selected ({selectedItems.size})
            </button>
          </div>
        </div>
        {showBulkOps && selectedIds.length > 0 && (
          <BulkOperations
            selectedQuestionIds={selectedIds}
            onClose={() => setShowBulkOps(false)}
          />
        )}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '15px'
        }}>
          {content.map((item) => {
            const isSelected = selectedItems.has(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleSelect(item.id)}
                style={{
                  padding: '15px',
                  border: `3px solid ${isSelected ? '#28a745' : '#dee2e6'}`,
                  borderRadius: '8px',
                  background: isSelected ? '#e8f5e9' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: '#28a745',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    ✓
                  </div>
                )}
                <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                  {item.metadata.question || item.metadata.description || item.metadata.title || 'No question text'}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  Answer: {item.metadata.answer || 'No answer'}
                </div>
                {item.metadata.topics && item.metadata.topics.length > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '12px' }}>
                    {item.metadata.topics.map((topic, idx) => (
                      <span key={idx} className="topic-tag-inline">{topic}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDocument = () => {
    const itemsToShow = selectedItems.size > 0 ? getSelectedContent() : content;
    const text = itemsToShow.map((item, idx) => {
      let output = `${idx + 1}. ${item.metadata.question || item.metadata.description || item.metadata.title || 'No question'}\n`;
      output += `   Answer: ${item.metadata.answer || 'No answer provided'}\n`;
      if (item.metadata.topics?.length) output += `   Topics: ${item.metadata.topics.join(', ')}\n`;
      return output + '\n';
    }).join('');
    
    return (
      <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Formatted Document View</h2>
          <button
            onClick={() => copyToClipboard(text)}
            style={{
              padding: '10px 20px',
              background: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            📋 Copy All (Word/Google Docs Ready)
          </button>
        </div>
        <div style={{
          background: '#fff',
          padding: '40px',
          borderRadius: '6px',
          border: '1px solid #ccc',
          maxWidth: '800px',
          margin: '0 auto',
          fontFamily: 'Times New Roman, serif',
          fontSize: '14px',
          lineHeight: '1.8',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          maxHeight: '600px',
          overflow: 'auto'
        }}>
          {itemsToShow.map((item, idx) => (
            <div key={item.id} style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: idx < itemsToShow.length - 1 ? '1px solid #eee' : 'none' }}>
              <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '15px' }}>
                {idx + 1}. {item.metadata.question || item.metadata.description || item.metadata.title || 'No question'}
              </div>
              <div style={{ marginLeft: '25px', color: '#555', fontSize: '13px' }}>
                Answer: <span style={{ fontStyle: 'italic' }}>{item.metadata.answer || 'No answer provided'}</span>
              </div>
              {item.metadata.topics && item.metadata.topics.length > 0 && (
                <div style={{ marginLeft: '25px', fontSize: '12px', color: '#888', marginTop: '5px' }}>
                  Topics: {item.metadata.topics.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderStructured = () => {
    const itemsToShow = selectedItems.size > 0 ? getSelectedContent() : content;
    const json = JSON.stringify(itemsToShow.map(item => ({
      question: item.metadata.question || item.metadata.description || 'No question',
      answer: item.metadata.answer || 'No answer',
      alternateAnswers: item.metadata.alternateAnswers || [],
      options: item.metadata.options || [],
      topics: item.metadata.topics || [],
      creator: item.metadata.creator || '',
      date: item.metadata.date || '',
      points: item.metadata.points,
      timer: item.metadata.timer,
      rounds: item.metadata.rounds?.map(r => r.name).join(' | ') || item.metadata.round || '',
      sets: item.metadata.sets?.map(s => s.name).join(' | ') || item.metadata.set || '',
      round: item.metadata.round, // Deprecated - kept for backward compatibility
      set: item.metadata.set, // Deprecated - kept for backward compatibility
      explanation: item.metadata.explanation,
      notes: item.metadata.notes,
      source: item.metadata.source,
      difficulty: item.metadata.difficulty,
      types: item.metadata.types,
      tags: item.metadata.tags,
      files: item.files || []
    })), null, 2);
    
    const csv = [
      ['Question', 'Answer', 'Alternate Answers', 'Options', 'Topics', 'Creator', 'Date', 'Points', 'Timer', 'Rounds', 'Sets', 'Explanation', 'Notes', 'Source'],
      ...itemsToShow.map(item => {
        const rounds = item.metadata.rounds?.map(r => r.name).join(' | ') || item.metadata.round || '';
        const sets = item.metadata.sets?.map(s => s.name).join(' | ') || item.metadata.set || '';
        return [
          `"${(item.metadata.question || item.metadata.description || '').replace(/"/g, '""')}"`,
          `"${(item.metadata.answer || '').replace(/"/g, '""')}"`,
          `"${(item.metadata.alternateAnswers?.join(' | ') || '').replace(/"/g, '""')}"`,
          `"${(item.metadata.options?.join(' | ') || '').replace(/"/g, '""')}"`,
          `"${(item.metadata.topics?.join('; ') || '').replace(/"/g, '""')}"`,
          `"${(item.metadata.creator || '').replace(/"/g, '""')}"`,
          `"${(item.metadata.date || '').replace(/"/g, '""')}"`,
          `"${(item.metadata.points?.toString() || '').replace(/"/g, '""')}"`,
          `"${(item.metadata.timer?.toString() || '').replace(/"/g, '""')}"`,
          `"${(rounds.replace(/"/g, '""'))}"`,
          `"${(sets.replace(/"/g, '""'))}"`,
          `"${(item.metadata.explanation || '').replace(/"/g, '""')}"`,
          `"${(item.metadata.notes || '').replace(/"/g, '""')}"`,
          `"${(item.metadata.source || '').replace(/"/g, '""')}"`
        ].join(',');
      })
    ].join('\n');

    return (
      <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Structured Data Export</h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => copyToClipboard(json)}
              style={{
                padding: '10px 20px',
                background: '#6f42c1',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              📋 Copy JSON
            </button>
            <button
              onClick={downloadAsJSON}
              style={{
                padding: '10px 20px',
                background: '#0066cc',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              💾 Download JSON
            </button>
            <button
              onClick={() => copyToClipboard(csv)}
              style={{
                padding: '10px 20px',
                background: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              📋 Copy CSV
            </button>
            <button
              onClick={downloadAsCSV}
              style={{
                padding: '10px 20px',
                background: '#0066cc',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              💾 Download CSV
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h3 style={{ marginBottom: '10px', fontSize: '16px' }}>JSON Format</h3>
            <textarea
              readOnly
              value={json}
              style={{
                width: '100%',
                minHeight: '400px',
                padding: '15px',
                fontFamily: 'monospace',
                fontSize: '12px',
                border: '2px solid #dee2e6',
                borderRadius: '6px',
                background: '#f8f9fa',
                resize: 'vertical'
              }}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
          </div>
          <div>
            <h3 style={{ marginBottom: '10px', fontSize: '16px' }}>CSV Format</h3>
            <textarea
              readOnly
              value={csv}
              style={{
                width: '100%',
                minHeight: '400px',
                padding: '15px',
                fontFamily: 'monospace',
                fontSize: '12px',
                border: '2px solid #dee2e6',
                borderRadius: '6px',
                background: '#f8f9fa',
                resize: 'vertical'
              }}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
          </div>
        </div>
      </div>
    );
  };

  const hasFilters = searchQuery.trim() || selectedTopic || selectedCreator || selectedDifficulty;
  const isExportView = ['qa-pairs', 'quiz-format', 'spreadsheet', 'plain-text', 'flashcards', 'bulk-copy', 'document', 'structured'].includes(viewMode);

  return (
    <div>
      <header className="header">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <h1>Trivia Content Repository</h1>
              <p>A collaborative repository for trivia content creators</p>
            </div>
            {currentUser ? (
              <div style={{
                padding: '12px 20px',
                background: '#e8f5e9',
                border: '2px solid #4caf50',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#2e7d32', fontWeight: '600', marginBottom: '4px' }}>
                    Logged in as:
                  </div>
                  <div style={{ fontSize: '18px', color: '#1b5e20', fontWeight: '700' }}>
                    {currentUser}
                  </div>
                </div>
                <Link
                  href="/login"
                  style={{
                    padding: '8px 16px',
                    background: '#fff',
                    color: '#2e7d32',
                    border: '1px solid #4caf50',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#c8e6c9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fff';
                  }}
                >
                  Switch User
                </Link>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem('current-user');
                    }
                    setCurrentUser(null);
                  }}
                  style={{
                    padding: '8px 16px',
                    background: '#fff',
                    color: '#c62828',
                    border: '1px solid #ef5350',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#ffcdd2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fff';
                  }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <div style={{
                padding: '12px 20px',
                background: '#fff3e0',
                border: '2px solid #ff9800',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#e65100', fontWeight: '600', marginBottom: '4px' }}>
                    Not logged in
                  </div>
                  <div style={{ fontSize: '14px', color: '#bf360c' }}>
                    Login to track your submissions
                  </div>
                </div>
                <Link
                  href="/login"
                  style={{
                    padding: '8px 16px',
                    background: '#ff9800',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f57c00';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ff9800';
                  }}
                >
                  Login →
                </Link>
              </div>
            )}
          </div>
          <Navigation />
        </div>
      </header>

      <main className="container">
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div className="stats">
            <p>
              <strong>{totalCount.toLocaleString()}</strong> total items in repository
              {hasFilters && (
                <> • <strong>{content.length}</strong> shown (page {page} of {totalPages})</>
              )}
            </p>
          </div>

          {/* View Mode Tabs */}
          <div style={{
            background: '#fff',
            padding: '15px 25px',
            borderRadius: '8px 8px 0 0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderBottom: '2px solid #e0e0e0',
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            {[
              { mode: 'search', label: '🔍 Search', desc: 'Find specific content' },
              { mode: 'browse', label: '📚 Browse', desc: 'Browse all content' },
              { mode: 'stats', label: '📊 Statistics', desc: 'View repository stats' },
              { mode: 'topics', label: '🏷️ Topics', desc: 'Browse by topic' },
              { mode: 'creators', label: '👤 Creators', desc: 'Browse by creator' },
              { mode: 'qa-pairs', label: '📝 Q&A Pairs', desc: 'Copy-friendly Q&A format' },
              { mode: 'quiz-format', label: '📋 Quiz Format', desc: 'Numbered quiz style' },
              { mode: 'spreadsheet', label: '📊 Spreadsheet', desc: 'Tab-separated for Excel' },
              { mode: 'plain-text', label: '📄 Plain Text', desc: 'Raw text export' },
              { mode: 'flashcards', label: '🃏 Flashcards', desc: 'Interactive flashcards' },
              { mode: 'bulk-copy', label: '📦 Bulk Copy', desc: 'Select & copy multiple' },
              { mode: 'document', label: '📑 Document', desc: 'Word/Google Docs format' },
              { mode: 'structured', label: '💾 Structured', desc: 'JSON/CSV export' }
            ].map(({ mode, label, desc }) => (
              <button
                key={mode}
                onClick={() => {
                  setViewMode(mode as ViewMode);
                  if (mode === 'browse' && content.length === 0) {
                    loadContent(1, true);
                  }
                }}
                title={desc}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  borderBottom: viewMode === mode ? '3px solid #0066cc' : '3px solid transparent',
                  background: 'transparent',
                  color: viewMode === mode ? '#0066cc' : '#666',
                  cursor: 'pointer',
                  fontWeight: viewMode === mode ? '600' : '500',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search Interface */}
          {viewMode === 'search' && (
            <div style={{
              background: '#fff',
              padding: '30px',
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '25px'
            }}>
              <h2 style={{ marginBottom: '20px' }}>Search Content</h2>
              <p style={{ color: '#666', marginBottom: '20px' }}>
                Search through {totalCount.toLocaleString()} items. Use filters to narrow your results.
              </p>

              <div style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="Search by title, creator, topic, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    border: '2px solid #0066cc',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
              </div>

              <div className="filters">
                <div className="filter-group">
                  <label>Topic</label>
                  <select
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    style={{ minWidth: '180px' }}
                  >
                    <option value="">All Topics</option>
                    {allTopics.map(topic => (
                      <option key={topic} value={topic}>{topic}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Creator</label>
                  <select
                    value={selectedCreator}
                    onChange={(e) => setSelectedCreator(e.target.value)}
                    style={{ minWidth: '180px' }}
                  >
                    <option value="">All Creators</option>
                    {allCreators.map(creator => (
                      <option key={creator} value={creator}>{creator}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Difficulty</label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    style={{ minWidth: '150px' }}
                  >
                    <option value="">All Levels</option>
                    <option value="beginner">Beginner</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>

              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  style={{
                    padding: '12px 24px',
                    background: '#0066cc',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
                {(hasFilters || content.length > 0) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedTopic('');
                      setSelectedCreator('');
                      setSelectedDifficulty('');
                      setContent([]);
                      setPage(1);
                      setSelectedItems(new Set());
                    }}
                    style={{
                      padding: '12px 24px',
                      background: '#f5f5f5',
                      color: '#333',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '16px',
                      cursor: 'pointer'
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Browse Mode */}
          {viewMode === 'browse' && (
            <div style={{
              background: '#fff',
              padding: '30px',
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '25px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Browse All Content</h2>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  Showing page {page} of {totalPages} ({content.length} items)
                </div>
              </div>
            </div>
          )}

          {/* Statistics View */}
          {viewMode === 'stats' && (
            <div style={{
              background: '#fff',
              padding: '30px',
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '25px'
            }}>
              <h2 style={{ marginBottom: '20px' }}>Repository Statistics</h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
              }}>
                <div style={{
                  padding: '20px',
                  background: '#e3f2fd',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1976d2' }}>
                    {totalCount.toLocaleString()}
                  </div>
                  <div style={{ color: '#666', marginTop: '5px' }}>Total Items</div>
                </div>
                <div style={{
                  padding: '20px',
                  background: '#f3e5f5',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#7b1fa2' }}>
                    {allTopics.length}
                  </div>
                  <div style={{ color: '#666', marginTop: '5px' }}>Topics</div>
                </div>
                <div style={{
                  padding: '20px',
                  background: '#e8f5e9',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#388e3c' }}>
                    {allCreators.length}
                  </div>
                  <div style={{ color: '#666', marginTop: '5px' }}>Creators</div>
                </div>
              </div>
              <p style={{ color: '#666', fontStyle: 'italic' }}>
                Use Search or Browse modes to explore the content.
              </p>
            </div>
          )}

          {/* Topics View */}
          {viewMode === 'topics' && (
            <div style={{
              background: '#fff',
              padding: '30px',
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '25px'
            }}>
              <h2 style={{ marginBottom: '20px' }}>Browse by Topic</h2>
              {allTopics.length === 0 ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#666',
                  background: '#f9f9f9',
                  borderRadius: '8px',
                  border: '2px dashed #ddd'
                }}>
                  <p style={{ fontSize: '18px', marginBottom: '10px' }}>No topics found</p>
                  <p style={{ fontSize: '14px' }}>
                    Topics will appear here once content with topics is added to the repository.
                    <br />
                    Add topics when submitting content or importing files.
                  </p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '15px'
                }}>
                  {allTopics.map(topic => (
                    <button
                      key={topic}
                      onClick={() => {
                        setSelectedTopic(topic);
                        setViewMode('search');
                        setSearchQuery('');
                        setTimeout(() => handleSearch(), 100);
                      }}
                      style={{
                        padding: '15px',
                        background: '#f5f5f5',
                        border: '2px solid #e0e0e0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        fontSize: '0.95rem',
                        fontWeight: '500'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#e3f2fd';
                        e.currentTarget.style.borderColor = '#0066cc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f5f5f5';
                        e.currentTarget.style.borderColor = '#e0e0e0';
                      }}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Creators View */}
          {viewMode === 'creators' && (
            <div style={{
              background: '#fff',
              padding: '30px',
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '25px'
            }}>
              <h2 style={{ marginBottom: '20px' }}>Browse by Creator</h2>
              {allCreators.length === 0 ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#666',
                  background: '#f9f9f9',
                  borderRadius: '8px',
                  border: '2px dashed #ddd'
                }}>
                  <p style={{ fontSize: '18px', marginBottom: '10px' }}>No creators found</p>
                  <p style={{ fontSize: '14px' }}>
                    Creators will appear here once content is added to the repository.
                    <br />
                    Add a creator when submitting content or importing files.
                  </p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '15px'
                }}>
                  {allCreators.map(creator => (
                    <button
                      key={creator}
                      onClick={() => {
                        setSelectedCreator(creator);
                        setViewMode('search');
                        setSearchQuery('');
                        setTimeout(() => handleSearch(), 100);
                      }}
                      style={{
                        padding: '15px',
                        background: '#f5f5f5',
                        border: '2px solid #e0e0e0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        fontSize: '0.95rem',
                        fontWeight: '500'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#e8f5e9';
                        e.currentTarget.style.borderColor = '#4caf50';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f5f5f5';
                        e.currentTarget.style.borderColor = '#e0e0e0';
                      }}
                    >
                      {creator}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Export Views */}
          {isExportView && content.length === 0 && (
            <div style={{
              background: '#fff',
              padding: '60px 30px',
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center',
              color: '#666'
            }}>
              <h2 style={{ marginBottom: '15px', color: '#333' }}>No content loaded</h2>
              <p style={{ marginBottom: '20px' }}>
                Use Search or Browse to load content, then switch to an export view.
              </p>
            </div>
          )}

          {isExportView && content.length > 0 && (
            <>
              {viewMode === 'qa-pairs' && renderQAPairs()}
              {viewMode === 'quiz-format' && renderQuizFormat()}
              {viewMode === 'spreadsheet' && renderSpreadsheet()}
              {viewMode === 'plain-text' && renderPlainText()}
              {viewMode === 'flashcards' && renderFlashcards()}
              {viewMode === 'bulk-copy' && renderBulkCopy()}
              {viewMode === 'document' && renderDocument()}
              {viewMode === 'structured' && renderStructured()}
            </>
          )}

          {/* Standard Content Display */}
          {loading && content.length === 0 ? (
            <div className="loading">
              <p>Loading content...</p>
            </div>
          ) : error ? (
            <div className="error">
              <strong>Error:</strong> {error}
            </div>
          ) : (viewMode === 'search' || viewMode === 'browse') && content.length > 0 ? (
            <>
              <div className="content-grid">
                {content.map(item => (
                  <div key={item.id} className="content-card">
                    <h3>{item.metadata.question || item.metadata.description || 'No question'}</h3>
                    <div className="meta-bar">
                      {item.metadata.creator && (
                        <div className="meta-item">
                          <strong>Creator:</strong> {item.metadata.creator}
                        </div>
                      )}
                      {item.metadata.date && (
                        <div className="meta-item">
                          <strong>Date:</strong> {new Date(item.metadata.date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    {(item.metadata.question || item.metadata.description) && (
                      <div className="description">
                        {((item.metadata.question || item.metadata.description) || '').length > 150
                          ? `${(item.metadata.question || item.metadata.description || '').substring(0, 150)}...`
                          : (item.metadata.question || item.metadata.description)}
                      </div>
                    )}
                    {/* Multiple Choice Options - Only show if there are multiple options */}
                    {item.metadata.options && item.metadata.options.length > 0 ? (
                      <div style={{
                        marginTop: '15px',
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
                            const allOptions = [...item.metadata.options];
                            const correctAnswer = item.metadata.answer;
                            
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
                                  <span style={{ 
                                    fontWeight: isCorrect ? '600' : '400',
                                    color: isCorrect ? '#2e7d32' : '#333'
                                  }}>
                                    {opt}
                                  </span>
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
                    ) : item.metadata.answer ? (
                      /* Simple answer display for non-multiple-choice questions */
                      <div style={{
                        marginTop: '15px',
                        padding: '12px',
                        background: '#e8f5e9',
                        borderRadius: '6px',
                        border: '1px solid #4caf50'
                      }}>
                        <strong style={{ color: '#2e7d32', fontSize: '1rem' }}>Answer:</strong>{' '}
                        <span style={{ fontSize: '0.95rem', fontWeight: '500', color: '#1b5e20' }}>{item.metadata.answer}</span>
                      </div>
                    ) : null}
                    {item.metadata.topics && item.metadata.topics.length > 0 && (
                      <div className="topics">
                        {item.metadata.topics.map((topic, idx) => (
                          <span key={idx} className="topic-tag">{topic}</span>
                        ))}
                      </div>
                    )}
                    {(item.metadata.rounds && item.metadata.rounds.length > 0) || 
                     (item.metadata.sets && item.metadata.sets.length > 0) || 
                     item.metadata.round || item.metadata.set ? (
                      <div style={{
                        marginTop: '10px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}>
                        {item.metadata.rounds?.map(round => (
                          <Link
                            key={round.id}
                            href={`/rounds/${round.id}`}
                            style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              background: '#e3f2fd',
                              color: '#0066cc',
                              borderRadius: '12px',
                              fontSize: '0.85rem',
                              textDecoration: 'none',
                              fontWeight: '500',
                              border: '1px solid #90caf9'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#bbdefb';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#e3f2fd';
                            }}
                          >
                            Round: {round.name}
                          </Link>
                        ))}
                        {item.metadata.sets?.map(set => (
                          <Link
                            key={set.id}
                            href={`/sets/${set.id}`}
                            style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              background: '#f3e5f5',
                              color: '#7b1fa2',
                              borderRadius: '12px',
                              fontSize: '0.85rem',
                              textDecoration: 'none',
                              fontWeight: '500',
                              border: '1px solid #ce93d8'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#e1bee7';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#f3e5f5';
                            }}
                          >
                            Set: {set.name}
                          </Link>
                        ))}
                        {/* Legacy round/set display (deprecated) */}
                        {item.metadata.round && !item.metadata.rounds?.length && (
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            background: '#e3f2fd',
                            color: '#0066cc',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                            border: '1px solid #90caf9'
                          }}>
                            Round: {item.metadata.round}
                          </span>
                        )}
                        {item.metadata.set && !item.metadata.sets?.length && (
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            background: '#f3e5f5',
                            color: '#7b1fa2',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                            border: '1px solid #ce93d8'
                          }}>
                            Set: {item.metadata.set}
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '10px',
                  marginTop: '30px',
                  padding: '20px',
                  background: '#fff',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <button
                    onClick={() => {
                      const newPage = Math.max(1, page - 1);
                      loadContent(newPage, true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={page === 1 || loading}
                    style={{
                      padding: '10px 20px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      background: page === 1 ? '#f5f5f5' : '#fff',
                      cursor: page === 1 ? 'not-allowed' : 'pointer',
                      opacity: page === 1 ? 0.5 : 1
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '0 15px', color: '#666' }}>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => {
                      const newPage = Math.min(totalPages, page + 1);
                      loadContent(newPage, true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={page === totalPages || loading}
                    style={{
                      padding: '10px 20px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      background: page === totalPages ? '#f5f5f5' : '#fff',
                      cursor: page === totalPages ? 'not-allowed' : 'pointer',
                      opacity: page === totalPages ? 0.5 : 1
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
