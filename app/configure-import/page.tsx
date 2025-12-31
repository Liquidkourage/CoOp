'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useUser } from '../contexts/UserContext';
import UserSelector from '../components/UserSelector';
import Navigation from '../components/Navigation';

interface FieldMapping {
  sourceColumn: string;
  targetField: string;
  required: boolean;
}

interface ImportConfig {
  formatName: string;
  fileType: 'csv' | 'excel' | 'json';
  columnMapping: Record<string, string>;
  detectionPatterns: string[];
  groupingFields: string[];
  sheetName?: string;
  multipleChoiceDetection?: {
    typeColumn?: string;
    questionColumn?: string;
    answerColumn?: string;
    xColumn?: string;
  };
  configuredAt: string;
  username: string;
}

// Available target fields in our system
const TARGET_FIELDS = [
  { 
    value: 'question', 
    label: 'Question (Required)', 
    required: true,
    description: 'The actual trivia question text. This is the main content of each question.'
  },
  { 
    value: 'answer', 
    label: 'Answer', 
    required: false,
    description: 'The correct answer to the question. For multiple-choice questions, this is the correct option.'
  },
  { 
    value: 'creator', 
    label: 'Creator (Required)', 
    required: true,
    description: 'The author or creator of the question. If not mapped, will use the logged-in user.'
  },
  { 
    value: 'date', 
    label: 'Date', 
    required: false,
    description: 'The date when the question was created or published. Format: YYYY-MM-DD or any standard date format.'
  },
  { 
    value: 'topics', 
    label: 'Topics', 
    required: false,
    description: 'Categories or subjects for the question. Use comma-separated values (e.g., "science, history, geography").'
  },
  { 
    value: 'types', 
    label: 'Question Types', 
    required: false,
    description: 'The type of question (e.g., "multiple-choice", "true-false", "short-answer"). Comma-separated if multiple.'
  },
  { 
    value: 'difficulty', 
    label: 'Difficulty', 
    required: false,
    description: 'Difficulty level: beginner, easy, medium, hard, or expert.'
  },
  { 
    value: 'round', 
    label: 'Round', 
    required: false,
    description: 'The round name this question belongs to. Questions can belong to multiple rounds.'
  },
  { 
    value: 'set', 
    label: 'Quiz Set/Event', 
    required: false,
    description: 'The quiz set or event name this question belongs to. Sets can contain multiple rounds.'
  },
  { 
    value: 'explanation', 
    label: 'Explanation', 
    required: false,
    description: 'An explanation of why the answer is correct. Useful for educational purposes.'
  },
  { 
    value: 'notes', 
    label: 'Host Notes', 
    required: false,
    description: 'Internal notes for the quiz host (not shown to players). Useful for hosting tips or additional context.'
  },
  { 
    value: 'alternateAnswers', 
    label: 'Alternative Answers', 
    required: false,
    description: 'Acceptable variations of the correct answer. Use comma-separated values (e.g., "USA, United States, U.S.A.").'
  },
  { 
    value: 'tags', 
    label: 'Tags', 
    required: false,
    description: 'Additional tags for organization and search. Comma-separated values.'
  },
  { 
    value: 'source', 
    label: 'Source', 
    required: false,
    description: 'URL or reference to a reliable web resource that verifies the question\'s accuracy (for fact-checking).'
  },
  { 
    value: 'media', 
    label: 'Media URL', 
    required: false,
    description: 'URL to audio or visual media associated with the question (e.g., audio clip, image, video). Examples: https://example.com/audio.mp3, https://example.com/image.jpg'
  },
  { 
    value: 'language', 
    label: 'Language', 
    required: false,
    description: 'Language code (e.g., "en" for English, "es" for Spanish). Defaults to "en" if not specified.'
  },
  { 
    value: 'questionCount', 
    label: 'Question Count', 
    required: false,
    description: 'Number of questions in a set or round (numeric). Usually only needed for sets/rounds, not individual questions.'
  },
  { 
    value: 'options', 
    label: 'Incorrect Options (Distractors)', 
    required: false,
    description: 'For multiple-choice questions: the incorrect answer options (distractors). Separate multiple options with semicolons (e.g., "Option A; Option B; Option C"). Do NOT include the correct answer here.'
  },
  { 
    value: 'skip', 
    label: 'Skip (ignore this column)', 
    required: false,
    description: 'Ignore this column during import. Use for columns you don\'t need.'
  },
];

export default function ConfigureImportPage() {
  const { currentUser } = useUser();
  const [step, setStep] = useState<'upload' | 'preview' | 'mapping' | 'test' | 'save'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'csv' | 'excel' | 'json' | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [formatName, setFormatName] = useState('');
  const [groupingFields, setGroupingFields] = useState<string[]>([]);
  const [detectionPatterns, setDetectionPatterns] = useState<string[]>([]);
  const [sheetName, setSheetName] = useState<string>('');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [savedConfigs, setSavedConfigs] = useState<ImportConfig[]>([]);
  const [editingConfigName, setEditingConfigName] = useState<string | null>(null);

  // Load saved configurations for current user
  useEffect(() => {
    if (currentUser) {
      const configs: ImportConfig[] = [];
      // Load all configs from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`import-config-${currentUser}-`)) {
          try {
            const config = JSON.parse(localStorage.getItem(key) || '{}');
            if (config.username === currentUser) {
              configs.push(config);
            }
          } catch (e) {
            console.error('Error loading config:', e);
          }
        }
      }
      setSavedConfigs(configs);
    }
  }, [currentUser]);

  const detectFileType = (fileName: string): 'csv' | 'excel' | 'json' | null => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.csv')) return 'csv';
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'excel';
    if (lower.endsWith('.json')) return 'json';
    return null;
  };

  const parseFile = async (file: File) => {
    const detectedType = detectFileType(file.name);
    if (!detectedType) {
      alert('Unsupported file type. Please upload CSV, Excel (.xlsx/.xls), or JSON file.');
      return;
    }

    setFileType(detectedType);
    setFile(file);

    try {
      if (detectedType === 'csv') {
        const text = await file.text();
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              const csvHeaders = Object.keys(results.data[0] as any);
              setHeaders(csvHeaders);
              setPreviewData((results.data as any[]).slice(0, 5));
              setDetectionPatterns(csvHeaders.map(h => h.toLowerCase().trim()));
              autoMapColumns(csvHeaders);
              setStep('preview');
            }
          },
          error: (error: Error) => {
            alert(`Error parsing CSV: ${error.message}`);
          }
        });
      } else if (detectedType === 'excel') {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        setSheetName(firstSheetName);
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 0) {
          const excelHeaders = (jsonData[0] as any[]).map(h => String(h || '').trim()).filter(Boolean);
          const rows = (jsonData.slice(1) as any[]).map((row: any[]) => {
            const obj: any = {};
            excelHeaders.forEach((header, idx) => {
              obj[header] = row[idx] !== undefined ? row[idx] : '';
            });
            return obj;
          }).filter((row: any) => Object.values(row).some((v: any) => v !== ''));
          
          setHeaders(excelHeaders);
          setPreviewData(rows.slice(0, 5));
          setDetectionPatterns(excelHeaders.map(h => h.toLowerCase().trim()));
          autoMapColumns(excelHeaders);
          setStep('preview');
        }
      } else if (detectedType === 'json') {
        const text = await file.text();
        const jsonData = JSON.parse(text);
        const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
        
        if (dataArray.length > 0) {
          // Get all unique keys from all objects
          const allKeys = new Set<string>();
          dataArray.forEach((item: any) => {
            if (typeof item === 'object' && item !== null) {
              Object.keys(item).forEach(key => allKeys.add(key));
            }
          });
          
          const jsonHeaders = Array.from(allKeys);
          setHeaders(jsonHeaders);
          setPreviewData(dataArray.slice(0, 5));
          setDetectionPatterns(jsonHeaders.map(h => h.toLowerCase().trim()));
          autoMapColumns(jsonHeaders);
          setStep('preview');
        }
      }
    } catch (error) {
      alert(`Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const autoMapColumns = (columnHeaders: string[]) => {
    const mapping: Record<string, string> = {};
    
    columnHeaders.forEach(header => {
      const lower = header.toLowerCase().trim();
      
      // Exact matches first
      if (lower === 'question' || lower === 'questions') {
        mapping[header] = 'question';
      } else if (lower === 'answer' || lower === 'correctanswer' || lower === 'correct_answer') {
        mapping[header] = 'answer';
      } else if (lower === 'creator' || lower === 'author' || lower === 'created_by' || lower === 'by') {
        mapping[header] = 'creator';
      } else if (lower === 'date' || lower === 'created' || lower === 'published') {
        mapping[header] = 'date';
      } else if (lower === 'category' || lower === 'categories') {
        mapping[header] = 'topics';
      } else if (lower === 'type' || lower === 'types') {
        mapping[header] = 'types';
      } else if (lower === 'difficulty' || lower === 'level') {
        mapping[header] = 'difficulty';
      } else if (lower === 'name' && !lower.includes('user') && !lower.includes('creator')) {
        // Skip - name without context is ambiguous
      } else if (lower.includes('tag')) {
        mapping[header] = 'tags';
      } else if (lower.includes('source')) {
        mapping[header] = 'source';
      } else if (lower.includes('option')) {
        mapping[header] = 'options';
      } else {
        // Partial matches
        if (lower.includes('question') && !mapping[header]) {
          mapping[header] = 'question';
        } else if (lower.includes('answer') && !mapping[header]) {
          mapping[header] = 'answer';
        } else if (lower.includes('creator') && !mapping[header]) {
          mapping[header] = 'creator';
        }
      }
    });
    
    setColumnMapping(mapping);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser) {
      alert('Please select or create a user first.');
      e.target.value = '';
      return;
    }

    if (e.target.files && e.target.files[0]) {
      await parseFile(e.target.files[0]);
    }
  };

  const testMapping = () => {
    if (!file || previewData.length === 0) return;

    const testResults: any[] = [];
    
    previewData.forEach((row, idx) => {
      const mapped: any = {};
      
      Object.keys(columnMapping).forEach(sourceCol => {
        const targetField = columnMapping[sourceCol];
        if (targetField && targetField !== 'skip') {
          const value = row[sourceCol];
          if (value !== undefined && value !== null && value.toString().trim()) {
            if (targetField === 'topics' || targetField === 'types' || targetField === 'tags') {
              // Split by comma if it's an array field
              mapped[targetField] = value.toString().split(',').map((v: string) => v.trim()).filter(Boolean);
            } else if (targetField === 'options') {
              // Handle options - can be dates or other values
              let optionStr = '';
              
              // Check if it's a Date object
              if (value instanceof Date) {
                optionStr = value.toISOString().split('T')[0];
              } else if (value !== null && value !== undefined) {
                // Check if it's an Excel date serial number
                const numVal = typeof value === 'number' ? value : parseFloat(String(value));
                if (!isNaN(numVal) && numVal > 25569 && numVal < 1000000) {
                  // Excel date serial number
                  const excelEpoch = new Date(1899, 11, 30);
                  const jsDate = new Date(excelEpoch.getTime() + (numVal - 1) * 86400 * 1000);
                  optionStr = jsDate.toISOString().split('T')[0];
                } else {
                  // Regular string value
                  const strVal = String(value).trim();
                  
                  // Check if it looks like a date string
                  const dateMatch = strVal.match(/^\d{4}-\d{2}-\d{2}$/) || 
                                   strVal.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/) ||
                                   strVal.match(/^\d{1,2}-\d{1,2}-\d{4}$/);
                  
                  if (dateMatch) {
                    const parsedDate = new Date(strVal);
                    if (!isNaN(parsedDate.getTime())) {
                      optionStr = parsedDate.toISOString().split('T')[0];
                    } else {
                      optionStr = strVal;
                    }
                  } else {
                    optionStr = strVal;
                  }
                }
              } else {
                optionStr = String(value || '').trim();
              }
              
              // Initialize options array if needed
              if (!mapped.options) {
                mapped.options = [];
              }
              
              // Split by comma if multiple options, otherwise add single value
              if (optionStr.includes(',')) {
                optionStr.split(',').forEach((opt: string) => {
                  const trimmed = opt.trim();
                  if (trimmed && !mapped.options.includes(trimmed)) {
                    mapped.options.push(trimmed);
                  }
                });
              } else if (optionStr && !mapped.options.includes(optionStr)) {
                mapped.options.push(optionStr);
              }
            } else {
              mapped[targetField] = value.toString().trim();
            }
          }
        }
      });
      
      // Title removed - individual questions never need titles
      
      // Validation: question is required, creator will be auto-filled from logged-in user
      const hasQuestion = !!(mapped.question || mapped.description);
      const hasCreator = !!mapped.creator;
      
      testResults.push({
        rowIndex: idx + 1,
        original: row,
        mapped: mapped,
        isValid: hasQuestion, // Only question is strictly required (creator auto-filled from logged-in user)
        warnings: [] // No warnings - creator will be auto-filled from logged-in user
      });
    });
    
    setTestResults(testResults);
    setStep('test');
  };

  const saveConfiguration = () => {
    if (!currentUser) {
      alert('Please select a user first.');
      return;
    }

    if (!formatName.trim()) {
      alert('Please enter a name for this import format.');
      return;
    }

    // Validate required mappings
    const hasQuestion = Object.values(columnMapping).includes('question') || 
                        Object.values(columnMapping).includes('description');
    
    if (!hasQuestion) {
      alert('Please map at least the "Question" field. This is required. Creator will automatically use the logged-in user.');
      return;
    }

    const config: ImportConfig = {
      formatName: formatName.trim(),
      fileType: fileType!,
      columnMapping,
      detectionPatterns,
      groupingFields,
      sheetName: fileType === 'excel' ? sheetName : undefined,
      configuredAt: new Date().toISOString(),
      username: currentUser
    };

    const configKey = `import-config-${currentUser}-${formatName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const isOverwriting = editingConfigName && editingConfigName.toLowerCase().replace(/[^a-z0-9]/g, '-') === formatName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    if (isOverwriting || editingConfigName === formatName.trim()) {
      // Overwriting existing config
      localStorage.setItem(configKey, JSON.stringify(config));
      alert(`Configuration "${formatName}" updated successfully!`);
    } else {
      // Check if name already exists
      const existingConfig = savedConfigs.find(c => c.formatName.toLowerCase() === formatName.trim().toLowerCase());
      if (existingConfig) {
        if (!confirm(`A configuration named "${formatName}" already exists. Do you want to overwrite it?`)) {
          return;
        }
      }
      localStorage.setItem(configKey, JSON.stringify(config));
      alert(`Configuration "${formatName}" saved successfully! You can now use this format when importing.`);
    }
    
    // Reset form
    setStep('upload');
    setFile(null);
    setHeaders([]);
    setPreviewData([]);
    setColumnMapping({});
    setFormatName('');
    setTestResults([]);
    setEditingConfigName(null);
    
    // Reload saved configs
    const configs: ImportConfig[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`import-config-${currentUser}-`)) {
        try {
          const cfg = JSON.parse(localStorage.getItem(key) || '{}');
          if (cfg.username === currentUser) {
            configs.push(cfg);
          }
        } catch (e) {
          console.error('Error loading config:', e);
        }
      }
    }
    setSavedConfigs(configs);
  };

  const loadConfiguration = (config: ImportConfig, isEdit: boolean = false) => {
    setFormatName(config.formatName);
    setFileType(config.fileType);
    setColumnMapping(config.columnMapping);
    setDetectionPatterns(config.detectionPatterns);
    setGroupingFields(config.groupingFields);
    if (config.sheetName) {
      setSheetName(config.sheetName);
    }
    setEditingConfigName(isEdit ? config.formatName : null);
    setStep('mapping');
  };

  const deleteConfiguration = (configName: string) => {
    if (!currentUser) return;
    if (!confirm(`Are you sure you want to delete the configuration "${configName}"? This cannot be undone.`)) {
      return;
    }
    const configKey = `import-config-${currentUser}-${configName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    localStorage.removeItem(configKey);
    
    // Reload saved configs
    const configs: ImportConfig[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`import-config-${currentUser}-`) && key !== configKey) {
        try {
          const cfg = JSON.parse(localStorage.getItem(key) || '{}');
          if (cfg.username === currentUser) {
            configs.push(cfg);
          }
        } catch (e) {
          console.error('Error loading config:', e);
        }
      }
    }
    setSavedConfigs(configs);
    if (editingConfigName === configName) {
      setEditingConfigName(null);
    }
  };

  return (
    <div>
      <header className="header">
        <div className="container">
          <h1>Configure Import Format</h1>
          <p>Upload an example file and map your columns to our content fields</p>
          <Navigation />
        </div>
      </header>

      <main className="container">
        <UserSelector />

        {!currentUser && (
          <div style={{ padding: '20px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', marginBottom: '20px' }}>
            <strong>⚠️ Please select or create a user first</strong> to configure import formats.
          </div>
        )}

        {/* Step 1: Upload File */}
        {step === 'upload' && (
          <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2>Step 1: Upload Example File</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Upload a sample file (CSV, Excel, or JSON) that represents your content format. 
              We'll use this to create a mapping configuration.
            </p>

            {/* Saved Configurations */}
            {savedConfigs.length > 0 && (
              <div style={{ marginBottom: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
                <h3 style={{ marginTop: '0' }}>Your Saved Formats</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {savedConfigs.map((config, idx) => (
                    <div key={idx} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '10px',
                      background: '#fff',
                      borderRadius: '4px',
                      border: '1px solid #dee2e6'
                    }}>
                      <div>
                        <strong>{config.formatName}</strong> ({config.fileType.toUpperCase()})
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {Object.keys(config.columnMapping).length} columns mapped
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => loadConfiguration(config, true)}
                          title="Edit this configuration"
                          style={{ padding: '5px 15px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => loadConfiguration(config)}
                          title="Load this configuration for importing (read-only)"
                          style={{ padding: '5px 15px', background: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                        >
                          📂 Load
                        </button>
                        <button
                          onClick={() => deleteConfiguration(config.formatName)}
                          title="Delete this configuration"
                          style={{ padding: '5px 15px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: '20px' }}>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.json"
                onChange={handleFileChange}
                disabled={!currentUser}
                style={{
                  padding: '10px',
                  border: '2px dashed #0066cc',
                  borderRadius: '8px',
                  width: '100%',
                  cursor: currentUser ? 'pointer' : 'not-allowed',
                  opacity: currentUser ? 1 : 0.6
                }}
              />
            </div>

            <div style={{ marginTop: '20px', padding: '15px', background: '#e7f3ff', borderRadius: '8px', fontSize: '14px' }}>
              <strong>💡 Tips:</strong>
              <ul style={{ margin: '10px 0 0 0', paddingLeft: '20px' }}>
                <li>Use a file with at least 2-3 example rows</li>
                <li>Make sure your file has column headers in the first row</li>
                <li>You can configure multiple formats and switch between them</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 2: Preview Data */}
        {step === 'preview' && (
          <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2>Step 2: Preview Your Data</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Here's a preview of your file. Review the columns and data, then proceed to mapping.
            </p>

            <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    {headers.map((header, idx) => (
                      <th key={idx} style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600' }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {headers.map((header, colIdx) => (
                        <td key={colIdx} style={{ padding: '10px', border: '1px solid #dee2e6', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {row[header] !== undefined && row[header] !== null ? String(row[header]).substring(0, 50) : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setStep('upload')}
                style={{ padding: '10px 20px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                ← Back
              </button>
              <button
                onClick={() => setStep('mapping')}
                style={{ padding: '10px 20px', background: '#0066cc', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Continue to Mapping →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Map Columns */}
        {step === 'mapping' && (
          <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2>Step 3: Map Your Columns</h2>
            {editingConfigName && (
              <div style={{ padding: '12px', background: '#d1ecf1', borderRadius: '6px', marginBottom: '15px', border: '2px solid #0c5460', fontSize: '14px' }}>
                <strong>✏️ Editing:</strong> <span style={{ color: '#0c5460' }}>{editingConfigName}</span>
                <button
                  onClick={() => {
                    setEditingConfigName(null);
                    setFormatName('');
                  }}
                  style={{ 
                    marginLeft: '15px', 
                    padding: '4px 10px', 
                    background: '#6c757d', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Cancel Edit
                </button>
              </div>
            )}
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Map each column from your file to a field in our system. 
              <strong> At minimum, you must map "Question" and "Creator" fields.</strong>
            </p>
            
            <div style={{ padding: '15px', background: '#fff3cd', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', border: '2px solid #ffc107' }}>
              <strong>💡 Tip:</strong> Select a field from any dropdown below to see its description. 
              Or scroll down to view all field descriptions at once.
            </div>

            <div style={{ marginBottom: '30px' }}>
              {headers.map((header, idx) => {
                const currentMapping = columnMapping[header] || '';
                const sampleValue = previewData[0]?.[header];
                
                return (
                  <div key={idx} style={{ 
                    marginBottom: '15px', 
                    padding: '15px', 
                    background: '#f8f9fa', 
                    borderRadius: '6px',
                    border: '1px solid #dee2e6'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1', minWidth: '200px' }}>
                        <strong style={{ display: 'block', marginBottom: '5px' }}>Your Column:</strong>
                        <code style={{ background: '#fff', padding: '5px 10px', borderRadius: '4px', fontSize: '14px' }}>
                          {header}
                        </code>
                        {sampleValue && (
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                            Sample: {String(sampleValue).substring(0, 50)}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: '1', minWidth: '200px' }}>
                        <strong style={{ display: 'block', marginBottom: '5px' }}>Map to:</strong>
                        <select
                          value={currentMapping}
                          onChange={(e) => {
                            setColumnMapping({ ...columnMapping, [header]: e.target.value });
                          }}
                          style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                            fontSize: '14px'
                          }}
                          title={currentMapping ? TARGET_FIELDS.find(f => f.value === currentMapping)?.description : ''}
                        >
                          <option value="">-- Select Field --</option>
                          {TARGET_FIELDS.map(field => (
                            <option key={field.value} value={field.value} title={field.description}>
                              {field.label} {field.required ? '⭐' : ''}
                            </option>
                          ))}
                        </select>
                        {currentMapping && TARGET_FIELDS.find(f => f.value === currentMapping)?.description && (
                          <div style={{ 
                            marginTop: '10px', 
                            padding: '12px', 
                            background: '#e7f3ff', 
                            borderRadius: '6px', 
                            fontSize: '13px',
                            color: '#0066cc',
                            border: '2px solid #b3d9ff',
                            lineHeight: '1.5'
                          }}>
                            <div style={{ fontWeight: '600', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>ℹ️</span>
                              <span>Field Description:</span>
                            </div>
                            <div style={{ color: '#333', paddingLeft: '20px' }}>
                              {TARGET_FIELDS.find(f => f.value === currentMapping)?.description}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ padding: '15px', background: '#e7f3ff', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
              <strong>ℹ️ Field Descriptions:</strong>
              <details style={{ marginTop: '10px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: '600', marginBottom: '10px', color: '#0066cc' }}>
                  📖 Click to view all field descriptions
                </summary>
                <div style={{ marginTop: '10px', maxHeight: '400px', overflowY: 'auto', padding: '10px', background: '#fff', borderRadius: '4px' }}>
                  {TARGET_FIELDS.map(field => (
                    <div key={field.value} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #b3d9ff' }}>
                      <strong style={{ color: '#0066cc', display: 'block', marginBottom: '4px' }}>
                        {field.label} {field.required && '⭐'}
                      </strong>
                      <div style={{ marginTop: '4px', color: '#333', fontSize: '13px', lineHeight: '1.5' }}>
                        {field.description}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
              <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '2px solid #b3d9ff' }}>
                <strong>Required Fields:</strong>
                <ul style={{ margin: '10px 0 0 0', paddingLeft: '20px' }}>
                  <li><strong>Question</strong> - The actual trivia question text (required)</li>
                  <li><strong>Creator</strong> - Will automatically use the logged-in user if not mapped</li>
                </ul>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setStep('preview')}
                style={{ padding: '10px 20px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                ← Back
              </button>
              <button
                onClick={testMapping}
                style={{ padding: '10px 20px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Test Mapping →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Test Results */}
        {step === 'test' && (
          <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2>Step 4: Test Your Mapping</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Review how your data will be transformed. Make sure everything looks correct before saving.
            </p>

            {testResults.map((result, idx) => {
              const hasWarnings = result.warnings && result.warnings.length > 0;
              return (
              <div key={idx} style={{ 
                marginBottom: '20px', 
                padding: '15px', 
                background: result.isValid ? (hasWarnings ? '#fff3cd' : '#d4edda') : '#f8d7da',
                borderRadius: '6px',
                border: `1px solid ${result.isValid ? (hasWarnings ? '#ffc107' : '#c3e6cb') : '#f5c6cb'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong>Row {result.rowIndex}</strong>
                  <span style={{ 
                    padding: '4px 10px', 
                    borderRadius: '4px', 
                    background: result.isValid ? (hasWarnings ? '#ffc107' : '#28a745') : '#dc3545',
                    color: '#fff',
                    fontSize: '12px'
                  }}>
                    {result.isValid ? (hasWarnings ? '⚠️ Valid (with warnings)' : '✓ Valid') : '✗ Invalid'}
                  </span>
                </div>
                
                {hasWarnings && (
                  <div style={{ 
                    marginBottom: '10px', 
                    padding: '10px', 
                    background: '#fff',
                    borderRadius: '4px',
                    border: '1px solid #ffc107'
                  }}>
                    <strong style={{ color: '#856404' }}>⚠️ Warnings:</strong>
                    <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px', color: '#856404' }}>
                      {result.warnings.map((warning: string, wIdx: number) => (
                        <li key={wIdx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div style={{ marginTop: '10px' }}>
                  <strong>Mapped Data:</strong>
                  <pre style={{ 
                    background: '#fff', 
                    padding: '10px', 
                    borderRadius: '4px', 
                    marginTop: '5px',
                    fontSize: '12px',
                    overflow: 'auto',
                    maxHeight: '200px'
                  }}>
                    {JSON.stringify(result.mapped, null, 2)}
                  </pre>
                </div>
              </div>
            );
            })}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setStep('mapping')}
                style={{ padding: '10px 20px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                ← Back to Mapping
              </button>
              <button
                onClick={() => setStep('save')}
                disabled={testResults.some(r => !r.isValid)}
                style={{ 
                  padding: '10px 20px', 
                  background: testResults.every(r => r.isValid) ? '#0066cc' : '#ccc',
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: testResults.every(r => r.isValid) ? 'pointer' : 'not-allowed'
                }}
              >
                Save Configuration →
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Save Configuration */}
        {step === 'save' && (
          <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2>Step 5: {editingConfigName ? 'Update' : 'Save'} Configuration</h2>
            {editingConfigName && (
              <div style={{ padding: '12px', background: '#d1ecf1', borderRadius: '6px', marginBottom: '15px', border: '2px solid #0c5460', fontSize: '14px' }}>
                <strong>✏️ Editing:</strong> <span style={{ color: '#0c5460' }}>{editingConfigName}</span>
                <div style={{ marginTop: '8px', fontSize: '13px', color: '#0c5460' }}>
                  Saving will update the existing configuration. You can change the name if you want to create a copy instead.
                </div>
              </div>
            )}
            <p style={{ color: '#666', marginBottom: '20px' }}>
              {editingConfigName 
                ? 'Update the configuration name if needed, or keep the same name to update the existing configuration.'
                : 'Give this import format a name so you can use it later when importing content.'}
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                Format Name:
              </label>
              <input
                type="text"
                value={formatName}
                onChange={(e) => setFormatName(e.target.value)}
                placeholder="e.g., 'My Trivia Format', 'Quiz Night Questions', etc."
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ padding: '15px', background: '#e7f3ff', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
              <strong>Summary:</strong>
              <ul style={{ margin: '10px 0 0 0', paddingLeft: '20px' }}>
                <li>File Type: <strong>{fileType?.toUpperCase()}</strong></li>
                <li>Columns Mapped: <strong>{Object.keys(columnMapping).filter(k => columnMapping[k] && columnMapping[k] !== 'skip').length}</strong></li>
                <li>Required Fields: {columnMapping && (Object.values(columnMapping).includes('question') || Object.values(columnMapping).includes('description')) ? '✓ Complete' : '✗ Missing'}</li>
                <li>Creator: {columnMapping && Object.values(columnMapping).includes('creator') ? '✓ Mapped' : 'ℹ️ Will use logged-in user'}</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setStep('test')}
                style={{ padding: '10px 20px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                ← Back
              </button>
              <button
                onClick={saveConfiguration}
                disabled={!formatName.trim()}
                style={{ 
                  padding: '10px 20px', 
                  background: formatName.trim() ? '#28a745' : '#ccc',
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: formatName.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                💾 Save Configuration
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

