'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useUser } from '../contexts/UserContext';
import UserSelector from '../components/UserSelector';
import Navigation from '../components/Navigation';

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  message?: string;
  debug?: any;
}

export default function ImportPage() {
  const router = useRouter();
  const { currentUser } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [showDebug, setShowDebug] = useState(false);
  const [trivnowConfig, setTrivnowConfig] = useState<any>(null);
  const [excelConfig, setExcelConfig] = useState<any>(null);
  const [savedConfigs, setSavedConfigs] = useState<any[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string>('');
  const [isTrivnowFormat, setIsTrivnowFormat] = useState(false);
  const [isExcelFormat, setIsExcelFormat] = useState(false);
  const [fileType, setFileType] = useState<'csv' | 'excel' | null>(null);
  const [defaultCreator, setDefaultCreator] = useState<string>('');

  // Load all saved configurations for current user
  useEffect(() => {
    if (currentUser) {
      const configs: any[] = [];
      // Load legacy configs
      const savedTrivnowConfig = localStorage.getItem(`trivnow-config-${currentUser}`);
      const savedExcelConfig = localStorage.getItem(`excel-config-${currentUser}`);
      
      if (savedTrivnowConfig) {
        try {
          const config = JSON.parse(savedTrivnowConfig);
          configs.push({ ...config, formatName: 'TrivNow CSV', fileType: 'csv', isLegacy: true });
        } catch (e) {
          console.error('Failed to parse TrivNow config:', e);
        }
      }
      
      if (savedExcelConfig) {
        try {
          const config = JSON.parse(savedExcelConfig);
          configs.push({ ...config, formatName: 'Excel Format', fileType: 'excel', isLegacy: true });
        } catch (e) {
          console.error('Failed to parse Excel config:', e);
        }
      }
      
      // Load new flexible configs
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

  // Check which formats are configured for current user
  const hasTrivnowConfig = currentUser ? !!localStorage.getItem(`trivnow-config-${currentUser}`) : false;
  const hasExcelConfig = currentUser ? !!localStorage.getItem(`excel-config-${currentUser}`) : false;
  const hasAnyConfig = savedConfigs.length > 0;

  // Group multiple-choice questions with their answer options
  const groupMultipleChoiceQuestions = (rawRows: any[], headers: string[]): any[] => {
    const groupedRows: any[] = [];
    const processedIndices = new Set<number>();
    
    // Find columns that might indicate question type or answer options
    const typeColumn = headers.find(h => 
      h.toLowerCase().includes('type') && 
      !h.toLowerCase().includes('question')
    );
    const questionColumn = headers.find(h => 
      h.toLowerCase().includes('question')
    );
    const answerColumn = headers.find(h => 
      (h.toLowerCase().includes('answer') || 
       h.toLowerCase().includes('option')) &&
      !h.toLowerCase().includes('correct')
    );
    
    for (let i = 0; i < rawRows.length; i++) {
      if (processedIndices.has(i)) continue;
      
      const row = { ...rawRows[i] }; // Copy row
      const rowType = typeColumn ? String(row[typeColumn] || '').toLowerCase() : '';
      const hasQuestion = questionColumn && row[questionColumn] && String(row[questionColumn]).trim();
      
      // Check if this is a multiple-choice question
      const isMultipleChoice = rowType.includes('multiple') || rowType.includes('choice') || 
                                rowType.includes('mc') || rowType === 'multiple choice';
      
      if (isMultipleChoice && hasQuestion) {
        // Collect answer options - start with the question row itself
        const answerOptions: string[] = [];
        let correctAnswerText = '';
        
        // Find the X column (marks correct answers) and Answer column (contains answer text)
        const xColumn = headers.find(h => 
          h.toLowerCase() === 'x' || 
          h.toLowerCase().startsWith('x ') ||
          h.toLowerCase() === 'correct'
        );
        const answerColumn = headers.find(h => 
          (h.toLowerCase().includes('answer') && !h.toLowerCase().includes('x')) ||
          h.toLowerCase().includes('option')
        );
        
        // Check the question row for answer options
        if (answerColumn) {
          const answerVal = String(row[answerColumn] || '').trim();
          if (answerVal && answerVal.length > 0 && answerVal.length < 200) {
            // Check if this row's X column marks it as correct
            const isCorrect = xColumn && (
              String(row[xColumn] || '').toLowerCase().includes('x') ||
              String(row[xColumn] || '').includes('✓') ||
              String(row[xColumn] || '').includes('√')
            );
            
            answerOptions.push(answerVal);
            if (isCorrect && !correctAnswerText) {
              correctAnswerText = answerVal;
            }
          }
        }
        
        // Now collect answer options from subsequent rows
        let j = i + 1;
        
        // Look ahead for answer options (rows with answer column filled but no question)
        while (j < rawRows.length) {
          const nextRow = rawRows[j];
          const nextHasQuestion = questionColumn && nextRow[questionColumn] && String(nextRow[questionColumn]).trim();
          
          // Stop if we hit another question row
          if (nextHasQuestion) {
            break;
          }
          
          // Check if this row has answer options
          // Check ALL columns for answer options (they might be in different columns)
          let foundAnswer = false;
          let correctAnswerText = '';
          
          // Collect all potential answer values from this row
          // Check if there's an Answer column and X column structure
          const potentialAnswers: Array<{text: string, isCorrect: boolean, column: string}> = [];
          
          // First, check if there's a separate Answer column (and X column for marking)
          if (answerColumn) {
            const answerVal = String(nextRow[answerColumn] || '').trim();
            if (answerVal && answerVal.length > 0 && answerVal.length < 200) {
              // Check if the X column marks this as correct
              const isCorrect = !!(xColumn && (
                String(nextRow[xColumn] || '').toLowerCase().includes('x') ||
                String(nextRow[xColumn] || '').includes('✓') ||
                String(nextRow[xColumn] || '').includes('√')
              ));
              
              potentialAnswers.push({
                text: answerVal,
                isCorrect: isCorrect,
                column: answerColumn
              });
            }
          }
          
          // If no answers found in Answer column, check other columns
          if (potentialAnswers.length === 0) {
            for (const header of headers) {
              if (header === questionColumn) continue;
              
              const val = String(nextRow[header] || '').trim();
              if (!val || val.length === 0) continue;
              
              // Skip obvious non-answer columns
              const headerLower = header.toLowerCase();
              if (headerLower.includes('type') || 
                  headerLower.includes('date') || 
                  headerLower.includes('creator') ||
                  headerLower.includes('category') ||
                  headerLower.includes('topic') ||
                  headerLower.includes('source') ||
                  headerLower.includes('points') ||
                  headerLower.includes('script') ||
                  headerLower.includes('label') ||
                  headerLower.includes('display') ||
                  headerLower.includes('clues') ||
                  headerLower.includes('media')) {
                continue;
              }
              
              // Skip if it's clearly not an answer (pure numbers, dates, etc.)
              if (/^\d+$/.test(val) || /^\d{4}-\d{2}-\d{2}/.test(val)) {
                continue;
              }
              
              // Skip if it contains question-related keywords
              if (val.toLowerCase().includes('multiple') || 
                  val.toLowerCase().includes('choice') ||
                  val.toLowerCase().includes('question')) {
                continue;
              }
              
              // If we get here, it might be an answer option
              const isCorrect = val.toLowerCase().includes('x') || 
                               val.includes('✓') || 
                               val.includes('√');
              const cleanAnswer = val.replace(/[x✓√]/gi, '').trim();
              
              if (cleanAnswer && cleanAnswer.length > 0 && cleanAnswer.length < 200) {
                potentialAnswers.push({
                  text: cleanAnswer,
                  isCorrect: isCorrect,
                  column: header
                });
              }
            }
          }
          
          // If we found potential answers, add them all
          if (potentialAnswers.length > 0) {
            // Add all answers to the options list
            potentialAnswers.forEach(potential => {
              answerOptions.push(potential.text);
              if (potential.isCorrect && !correctAnswerText) {
                correctAnswerText = potential.text;
              }
            });
            foundAnswer = true;
          }
          
          // Set the correct answer if we found one
          if (correctAnswerText && !row.answer) {
            row.answer = correctAnswerText;
          }
          
          if (foundAnswer) {
            processedIndices.add(j);
            j++;
          } else {
            // No more answer options found, stop looking
            break;
          }
        }
        
        // Store answer options in options array (structured data)
        if (answerOptions.length > 0) {
          // Store options as a structured array
          row.options = answerOptions;
          
          // Keep question text clean (don't append options)
          // The options will be stored separately in the options field
          
          // Set the correct answer if we found one, otherwise default to first
          if (!row.answer) {
            row.answer = correctAnswerText || answerOptions[0];
          }
        }
      }
      
      groupedRows.push(row);
    }
    
    return groupedRows;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser) {
      alert('Please select or create a user first.');
      e.target.value = '';
      return;
    }

    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setResult(null);
      setPreview([]);
      
      // Detect file type
      const fileName = selectedFile.name.toLowerCase();
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      const isCsv = fileName.endsWith('.csv');
      setFileType(isExcel ? 'excel' : isCsv ? 'csv' : null);
      
      // Check for configurations (user-specific)
      const savedTrivnowConfig = currentUser ? localStorage.getItem(`trivnow-config-${currentUser}`) : null;
      const savedExcelConfig = currentUser ? localStorage.getItem(`excel-config-${currentUser}`) : null;
      
      let trivnowConfig = null;
      let excelConfig = null;
      let matchedConfig = null;
      
      // Try to find a matching saved configuration
      if (currentUser && savedConfigs.length > 0) {
        const fileHeaders: string[] = [];
        
        // We'll populate fileHeaders after parsing, but check configs that match file type
        const matchingConfigs = savedConfigs.filter(config => {
          if (isExcel && config.fileType === 'excel') return true;
          if (isCsv && config.fileType === 'csv') return true;
          return false;
        });
        
        // If a config is selected, use it
        if (selectedConfig) {
          matchedConfig = matchingConfigs.find(c => c.formatName === selectedConfig);
        }
      }
      
      if (savedTrivnowConfig) {
        try {
          trivnowConfig = JSON.parse(savedTrivnowConfig);
          setTrivnowConfig(trivnowConfig);
        } catch (e) {
          console.error('Failed to parse TrivNow config:', e);
        }
      }
      
      if (savedExcelConfig) {
        try {
          excelConfig = JSON.parse(savedExcelConfig);
          setExcelConfig(excelConfig);
        } catch (e) {
          console.error('Failed to parse Excel config:', e);
        }
      }
      
      if (isExcel) {
        // Handle Excel file
        try {
          const arrayBuffer = await selectedFile.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const firstSheetName = excelConfig?.sheetName || workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length > 0) {
            const headers = (jsonData[0] as any[]).map(h => String(h || '').trim()).filter(Boolean);
            const rows = jsonData.slice(1).map((row: any) => {
              const obj: any = {};
              headers.forEach((header, idx) => {
                obj[header] = row[idx] !== undefined ? row[idx] : '';
              });
              return obj;
            }).filter((row: any) => Object.values(row).some((v: any) => v !== ''));
            
            setPreview(rows.slice(0, 5));
            
            // Check if this matches a saved configuration
            const headerLower = headers.map(h => h.toLowerCase().trim());
            let matchedConfig = null;
            
            // Check selected config first
            if (selectedConfig) {
              matchedConfig = savedConfigs.find(c => c.formatName === selectedConfig && c.fileType === 'excel');
            }
            
            // If no selected config, try to auto-detect
            if (!matchedConfig) {
              matchedConfig = savedConfigs.find(config => {
                if (config.fileType !== 'excel') return false;
                if (config.detectionPatterns && config.detectionPatterns.length > 0) {
                  return config.detectionPatterns.some((pattern: string) => 
                    headerLower.includes(pattern.toLowerCase().trim())
                  );
                }
                return false;
              });
            }
            
            // Fall back to legacy Excel config
            if (!matchedConfig && excelConfig) {
              const isExcelFormat = excelConfig.detectionPatterns && 
                excelConfig.detectionPatterns.some((pattern: string) => 
                  headerLower.includes(pattern.toLowerCase().trim())
                );
              if (isExcelFormat) {
                matchedConfig = excelConfig;
              }
            }
            
            setIsExcelFormat(!!matchedConfig);
            if (matchedConfig) {
              setExcelConfig(matchedConfig);
              setSelectedConfig(matchedConfig.formatName || 'Excel Format');
            }
            
            // Start with matched config mapping if available, otherwise empty
            const mapping: Record<string, string> = matchedConfig && matchedConfig.columnMapping 
              ? { ...matchedConfig.columnMapping }
              : {};
            
              // Auto-map fields
              headers.forEach(header => {
                if (mapping[header]) return;
                
                const lower = header.toLowerCase().trim();
                // Check exact matches first
                if (lower === 'question' || lower === 'questions') {
                  // Map Question column to description (will be used for title generation)
                  mapping[header] = 'description';
                } else if (lower === 'category') {
                  // Category is often a round/category name, map to description (can be changed by user)
                  mapping[header] = 'description';
                } else if (lower === 'type') {
                  // "Type" column is usually question type, not file format
                  mapping[header] = 'types';
                } else if (lower.includes('title') || lower.includes('name') || lower === 'quiz' || lower === 'set') {
                  mapping[header] = 'title';
                } else if (lower.includes('creator') || lower.includes('author') || lower.includes('user') || lower.includes('owner') || lower === 'by') {
                  mapping[header] = 'creator';
                } else if (lower.includes('date') || lower.includes('created') || lower.includes('published')) {
                  mapping[header] = 'date';
                } else if (lower.includes('topic') || lower.includes('subject') || lower.includes('tag')) {
                  // Don't auto-map "category" here - it's handled above
                  mapping[header] = 'topics';
                // Format field removed - skip it
                } else if ((lower.includes('question') && lower.includes('count')) || lower === 'count') {
                  mapping[header] = 'questionCount';
                } else if (lower.includes('difficulty') || lower.includes('level') || lower.includes('difficult')) {
                  mapping[header] = 'difficulty';
                } else if (lower.includes('description') || lower.includes('desc') || lower.includes('notes')) {
                  mapping[header] = 'description';
                } else if (lower.includes('question') && lower.includes('type')) {
                  mapping[header] = 'types';
                } else if (lower === 'correctanswer' || lower === 'correct_answer' || (lower.includes('correct') && lower.includes('answer'))) {
                  mapping[header] = 'answer';
                }
              });
            
            setColumnMapping(mapping);
          }
        } catch (error) {
          setResult({
            success: false,
            imported: 0,
            errors: [error instanceof Error ? error.message : 'Failed to read Excel file']
          });
        }
      } else {
        // Handle CSV file
        Papa.parse(selectedFile, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              setPreview(results.data.slice(0, 5) as any[]);
              const headers = Object.keys(results.data[0] as any);
              
              // Check if this looks like TrivNow format
              const headerLower = headers.map(h => h.toLowerCase().trim());
              const isTrivnow = trivnowConfig && trivnowConfig.detectionPatterns && 
                trivnowConfig.detectionPatterns.some((pattern: string) => 
                  headerLower.includes(pattern.toLowerCase().trim())
                );
              setIsTrivnowFormat(!!isTrivnow);
              
              // Start with TrivNow config mapping if available, otherwise empty
              const mapping: Record<string, string> = isTrivnow && trivnowConfig.columnMapping 
                ? { ...trivnowConfig.columnMapping }
                : {};
              
              // Auto-map fields that aren't already mapped (for both TrivNow and regular CSVs)
              headers.forEach(header => {
                // Skip if already mapped (preserves TrivNow config mappings)
                if (mapping[header]) return;
                
                const lower = header.toLowerCase().trim();
                // Check exact matches first
                if (lower === 'question' || lower === 'questions') {
                  // Map Question column to description (will be used for title generation)
                  mapping[header] = 'description';
                } else if (lower === 'category') {
                  // Category is often a round/category name, map to description (can be changed by user)
                  mapping[header] = 'description';
                } else if (lower === 'type') {
                  // "Type" column is usually question type, not file format
                  mapping[header] = 'types';
                } else if (lower.includes('title') || lower.includes('name') || lower === 'quiz' || lower === 'set') {
                  mapping[header] = 'title';
                } else if (lower.includes('creator') || lower.includes('author') || lower.includes('user') || lower.includes('owner') || lower === 'by') {
                  mapping[header] = 'creator';
                } else if (lower.includes('date') || lower.includes('created') || lower.includes('published')) {
                  mapping[header] = 'date';
                } else if (lower.includes('topic') || lower.includes('subject') || lower.includes('tag')) {
                  // Don't auto-map "category" here - it's handled above
                  mapping[header] = 'topics';
                // Format field removed - skip it
                } else if ((lower.includes('question') && lower.includes('count')) || lower === 'count') {
                  mapping[header] = 'questionCount';
                } else if (lower.includes('difficulty') || lower.includes('level') || lower.includes('difficult')) {
                  mapping[header] = 'difficulty';
                } else if (lower.includes('description') || lower.includes('desc') || lower.includes('notes')) {
                  mapping[header] = 'description';
                } else if (lower.includes('question') && lower.includes('type')) {
                  mapping[header] = 'types';
                } else if (lower === 'correctanswer' || lower === 'correct_answer' || (lower.includes('correct') && lower.includes('answer'))) {
                  mapping[header] = 'answer';
                }
              });
              
              setColumnMapping(mapping);
            }
          },
          error: (error) => {
            setResult({
              success: false,
              imported: 0,
              errors: [error.message]
            });
          }
        });
      }
    }
  };

  const processRows = async (rows: any[]) => {
    const errors: string[] = [];
    let imported = 0;
    const debugInfo: any = {
      totalRows: rows.length,
      firstRow: rows[0],
      columnMapping: columnMapping,
      availableColumns: rows[0] ? Object.keys(rows[0]) : [],
      isTrivnowFormat: isTrivnowFormat,
      isExcelFormat: isExcelFormat,
      fileType: fileType
    };

    // Import each row as a separate content item (one row = one content item)
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const metadata: any = {};
        
        // First pass: collect all values for each mapped field
        const fieldValues: Record<string, any[]> = {};
        
        Object.keys(columnMapping).forEach(col => {
          const mappedField = columnMapping[col];
          if (!mappedField || mappedField === 'skip') return;
          
          const value = row[col];
          
          // Handle options specially - preserve original value type for date handling
          if (mappedField === 'options') {
            if (value !== undefined && value !== null) {
              if (!fieldValues[mappedField]) {
                fieldValues[mappedField] = [];
              }
              fieldValues[mappedField].push(value); // Keep original value for date detection
            }
          } else if (value !== undefined && value !== null && value.toString().trim()) {
            if (!fieldValues[mappedField]) {
              fieldValues[mappedField] = [];
            }
            fieldValues[mappedField].push(value.toString().trim());
          }
        });
        
        // Process collected values
        Object.keys(fieldValues).forEach(mappedField => {
          const values = fieldValues[mappedField];
          
          if (mappedField === 'topics') {
            // Combine all topic values and split by comma
            const allTopics = values.join(',').split(',').map((t: string) => t.trim()).filter(Boolean);
            metadata.topics = [...new Set(allTopics)]; // Remove duplicates
          } else if (mappedField === 'questionCount') {
            // Use the first valid number
            const num = parseInt(values[0]) || undefined;
            if (num) metadata.questionCount = num;
          } else if (mappedField === 'types') {
            // Combine all type values and split by comma
            const allTypes = values.join(',').split(',').map((t: string) => t.trim()).filter(Boolean);
            metadata.types = [...new Set(allTypes)]; // Remove duplicates
          } else if (mappedField === 'description' || mappedField === 'question') {
            // Concatenate multiple question fields with line breaks
            const questionText = values.join('\n\n');
            metadata.question = questionText;
            metadata.description = questionText; // Backward compatibility
          } else if (mappedField === 'creator') {
            // Use first non-empty creator value
            metadata.creator = values.find(v => v) || '';
          } else if (mappedField === 'answer') {
            // Store answer in both answer and correctAnswer fields
            const answerValue = values[0];
            metadata.answer = answerValue;
            metadata.correctAnswer = answerValue;
          } else if (mappedField === 'options') {
            // Handle options - can be from multiple columns (e.g., date columns mapped to options)
            // Collect all option values, handling dates and other formats
            const optionValues: string[] = [];
            values.forEach((val: any) => {
              // Convert value to string, handling dates
              let optionStr = '';
              
              // Check if it's a Date object
              if (val instanceof Date) {
                // Format date as YYYY-MM-DD
                optionStr = val.toISOString().split('T')[0];
              } else if (val !== null && val !== undefined) {
                // Check if it's an Excel date serial number (numeric dates)
                const numVal = typeof val === 'number' ? val : parseFloat(String(val));
                if (!isNaN(numVal) && numVal > 25569 && numVal < 1000000) {
                  // Excel date serial number (days since 1900-01-01)
                  // Excel epoch: January 1, 1900 = 1
                  // JavaScript epoch: January 1, 1970 = 25569 in Excel
                  const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899 (Excel's epoch)
                  const jsDate = new Date(excelEpoch.getTime() + (numVal - 1) * 86400 * 1000);
                  optionStr = jsDate.toISOString().split('T')[0];
                } else {
                  // Regular string value or other format
                  const strVal = String(val).trim();
                  
                  // Check if it looks like a date string (YYYY-MM-DD, MM/DD/YYYY, etc.)
                  const dateMatch = strVal.match(/^\d{4}-\d{2}-\d{2}$/) || 
                                   strVal.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/) ||
                                   strVal.match(/^\d{1,2}-\d{1,2}-\d{4}$/);
                  
                  if (dateMatch) {
                    // Try to parse and format as YYYY-MM-DD
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
                optionStr = String(val || '').trim();
              }
              
              // Split by comma if multiple options in one cell
              if (optionStr.includes(',')) {
                optionStr.split(',').forEach(opt => {
                  const trimmed = opt.trim();
                  if (trimmed && !optionValues.includes(trimmed)) {
                    optionValues.push(trimmed);
                  }
                });
              } else if (optionStr && !optionValues.includes(optionStr)) {
                optionValues.push(optionStr);
              }
            });
            
            // Merge with existing options if any (from groupMultipleChoiceQuestions)
            if (row.options && Array.isArray(row.options) && row.options.length > 0) {
              metadata.options = [...new Set([...row.options, ...optionValues])];
            } else {
              metadata.options = optionValues;
            }
          } else {
            // For other fields, use the first value (or concatenate if it makes sense)
            metadata[mappedField] = values[0];
          }
        });

        // Handle options array if present (from groupMultipleChoiceQuestions) and not already processed
        if (!metadata.options && row.options && Array.isArray(row.options) && row.options.length > 0) {
          metadata.options = row.options;
        }

        // Generate title from question if not mapped
        if (!metadata.title) {
          // Try to find a question column (case-insensitive)
          const questionKey = Object.keys(row).find(key => 
            key.toLowerCase() === 'question' || key.toLowerCase() === 'questions'
          );
          
          if (questionKey && row[questionKey]) {
            // Use first part of question as title
            const questionText = row[questionKey].toString().trim();
            if (questionText) {
              metadata.title = questionText.substring(0, 100) + (questionText.length > 100 ? '...' : '');
            }
          }
          
          // If still no title, try to use question if available
          if (!metadata.title && (metadata.question || metadata.description)) {
            const questionText = metadata.question || metadata.description || '';
            metadata.title = questionText.substring(0, 100) + (questionText.length > 100 ? '...' : '');
          }
          
          // Title is optional - if still no title, use question text as fallback
          if (!metadata.title) {
            if (metadata.question || metadata.description) {
              // Use question as title (truncated)
              const questionText = metadata.question || metadata.description || '';
              metadata.title = questionText.substring(0, 100) + (questionText.length > 100 ? '...' : '');
            } else {
              // Last resort: use first available text field
              const firstTextValue = Object.values(row).find(v => v && v.toString().trim());
              if (firstTextValue) {
                metadata.title = firstTextValue.toString().trim().substring(0, 100);
              } else {
                metadata.title = 'Untitled Question';
              }
            }
          }
        }

        // Use current user as creator if no creator is mapped
        if (!metadata.creator) {
          if (currentUser) {
            // Use logged-in user as creator
            metadata.creator = currentUser;
          } else if (defaultCreator.trim()) {
            metadata.creator = defaultCreator.trim();
          } else if ((isTrivnowFormat || isExcelFormat) && row['source']) {
            metadata.creator = row['source'].toString();
          } else {
            errors.push(`Row ${i + 1}: Missing creator (title: ${metadata.title}). Please select a user or set a default creator above.`);
            continue;
          }
        }

        if (!metadata.date) {
          metadata.date = new Date().toISOString().split('T')[0];
        }

        const formData = new FormData();
        formData.append('metadata', JSON.stringify(metadata));

        const response = await fetch('/api/submit', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          errors.push(`Row ${i + 1}: ${result.error || 'Failed to import'}`);
        } else {
          imported++;
        }
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { imported, errors, debugInfo };
  };

  const handleImport = async () => {
    if (!currentUser) {
      alert('Please select or create a user first before importing.');
      return;
    }
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      if (fileType === 'excel') {
        // Handle Excel file
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = excelConfig?.sheetName || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 0) {
          const headers = (jsonData[0] as any[]).map(h => String(h || '').trim()).filter(Boolean);
          
          // Convert raw rows to objects
          const rawRows = jsonData.slice(1).map((row: any) => {
            const obj: any = {};
            headers.forEach((header, idx) => {
              obj[header] = row[idx] !== undefined ? row[idx] : '';
            });
            return obj;
          }).filter((row: any) => Object.values(row).some((v: any) => v !== ''));
          
          // Group multiple-choice questions with their answer options
          const rows = groupMultipleChoiceQuestions(rawRows, headers);
          
          const { imported, errors, debugInfo } = await processRows(rows);
          
          setResult({
            success: imported > 0,
            imported,
            errors,
            message: `Imported ${imported} of ${rows.length} rows`,
            debug: debugInfo
          });
          setImporting(false);
        } else {
          setResult({
            success: false,
            imported: 0,
            errors: ['Excel file appears to be empty']
          });
          setImporting(false);
        }
      } else {
        // Handle CSV file
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            const rows = results.data as any[];
            const { imported, errors, debugInfo } = await processRows(rows);
            
            setResult({
              success: imported > 0,
              imported,
              errors,
              message: `Imported ${imported} of ${rows.length} rows`,
              debug: debugInfo
            });
            setImporting(false);
          },
          error: (error) => {
            setResult({
              success: false,
              imported: 0,
              errors: [error.message]
            });
            setImporting(false);
          }
        });
      }
    } catch (error) {
      setResult({
        success: false,
        imported: 0,
        errors: [error instanceof Error ? error.message : 'Failed to parse file']
      });
      setImporting(false);
    }
  };

  return (
    <div>
      <header className="header">
        <div className="container">
          <h1>Import CSV/Excel</h1>
          <p>Import trivia content from a CSV or Excel (.xlsx) file</p>
          <Navigation />
          <UserSelector />
          {!currentUser && (
            <div style={{
              background: '#fff3cd',
              border: '1px solid #ffc107',
              padding: '15px',
              borderRadius: '6px',
              marginTop: '15px',
              color: '#856404'
            }}>
              ⚠️ Please select or create a user to import content. You'll only see formats you've configured.
            </div>
          )}
        </div>
      </header>

      <main className="container">
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{
            background: '#fff',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
            <h2 style={{ marginBottom: '20px' }}>CSV/Excel Format</h2>
            <p style={{ marginBottom: '15px', color: '#666' }}>
              Your CSV or Excel file should have columns that can be mapped to our metadata fields:
            </p>
            <div style={{
              background: '#f5f5f5',
              padding: '15px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '14px',
              marginBottom: '20px'
            }}>
              <div><strong>Required:</strong> title (or will be auto-generated from question text)</div>
              <div><strong>Creator:</strong> Either map a "creator" column OR set a default creator below</div>
              <div><strong>Optional:</strong> date, topics (comma-separated), questionCount, difficulty, types, description</div>
            </div>
            <div style={{
              background: '#e3f2fd',
              padding: '15px',
              borderRadius: '4px',
              marginTop: '15px'
            }}>
              <strong>Example CSV:</strong>
              <pre style={{ marginTop: '10px', fontSize: '12px', overflow: 'auto' }}>
{`title,creator,date,topics,format,questionCount,difficulty
"Science Quiz","John Doe","2024-01-15","science,physics","csv",25,"medium"
"History Trivia","Jane Smith","2024-01-16","history,world-war-ii","xlsx",50,"hard"`}
              </pre>
            </div>
          </div>

          <div style={{
            background: '#fff',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {hasAnyConfig && (
              <div style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>
                  Use Saved Configuration (Optional)
                </label>
                <select
                  value={selectedConfig}
                  onChange={(e) => {
                    setSelectedConfig(e.target.value);
                    if (e.target.value) {
                      const config = savedConfigs.find(c => c.formatName === e.target.value);
                      if (config) {
                        setColumnMapping(config.columnMapping || {});
                        if (config.fileType === 'excel') {
                          setIsExcelFormat(true);
                          setExcelConfig(config);
                        } else if (config.fileType === 'csv') {
                          setIsTrivnowFormat(true);
                          setTrivnowConfig(config);
                        }
                      }
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '16px',
                    background: '#fff'
                  }}
                >
                  <option value="">-- Select a saved format (or configure new) --</option>
                  {savedConfigs.map((config, idx) => (
                    <option key={idx} value={config.formatName}>
                      {config.formatName} ({config.fileType?.toUpperCase() || 'Unknown'})
                    </option>
                  ))}
                </select>
                <p style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>
                  💡 Don't have a configuration? <Link href="/configure-import" style={{ color: '#0066cc' }}>Create one here</Link>
                </p>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>
                Select CSV or Excel File
              </label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                disabled={!currentUser}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px',
                  cursor: currentUser ? 'pointer' : 'not-allowed',
                  opacity: currentUser ? 1 : 0.6
                }}
              />
              {!hasAnyConfig && currentUser && (
                <p style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>
                  💡 <Link href="/configure-import" style={{ color: '#0066cc' }}>Configure a format</Link> to make imports easier!
                </p>
              )}
            </div>

            {preview.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '15px' }}>Column Mapping</h3>
                {(isTrivnowFormat || isExcelFormat) && (
                  <div style={{
                    background: '#e3f2fd',
                    border: '1px solid #2196f3',
                    padding: '15px',
                    borderRadius: '4px',
                    marginBottom: '15px'
                  }}>
                    <strong>⚙️ {isExcelFormat ? 'Excel' : 'TrivNow'} Format Detected</strong>
                    <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>
                      Each row will be imported as a separate content item. Map the columns you want to include in the metadata.
                      <br />
                      <strong>Tip:</strong> The "question" column can be mapped to "description", and "source" can be mapped to "creator".
                    </p>
                  </div>
                )}
                {!currentUser && (
                  <div style={{
                    background: '#fff3cd',
                    border: '1px solid #ffc107',
                    padding: '15px',
                    borderRadius: '4px',
                    marginBottom: '15px'
                  }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                      Default Creator (Required if no user selected and CSV doesn't have creator column)
                    </label>
                    <input
                      type="text"
                      value={defaultCreator}
                      onChange={(e) => setDefaultCreator(e.target.value)}
                      placeholder="Enter your name or creator name"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '16px'
                      }}
                    />
                    <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#666' }}>
                      This will be used as the creator for all imported items if no creator column is mapped.
                    </p>
                  </div>
                )}
                {currentUser && (
                  <div style={{
                    background: '#e7f3ff',
                    border: '1px solid #0066cc',
                    padding: '15px',
                    borderRadius: '4px',
                    marginBottom: '15px'
                  }}>
                    <p style={{ margin: '0', fontSize: '14px', color: '#0066cc' }}>
                      ℹ️ <strong>Creator:</strong> Will automatically use <strong>{currentUser}</strong> for all imported items (unless a creator column is mapped).
                    </p>
                  </div>
                )}
                <p style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>
                  Map your {fileType === 'excel' ? 'Excel' : 'CSV'} columns to our metadata fields. Auto-detected mappings are shown below.
                  {!(isTrivnowFormat || isExcelFormat) && (
                    <strong style={{ color: '#c62828', display: 'block', marginTop: '5px' }}>
                      Make sure "Title" column is mapped, or set a default creator above!
                    </strong>
                  )}
                </p>
                <div style={{
                  background: '#f9f9f9',
                  padding: '15px',
                  borderRadius: '4px',
                  marginBottom: '15px'
                }}>
                  {Object.keys(preview[0] || {}).map((csvCol) => (
                    <div key={csvCol} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <label style={{ minWidth: '150px', fontWeight: '500' }}>{csvCol}:</label>
                      <select
                        value={columnMapping[csvCol] || ''}
                        onChange={(e) => setColumnMapping({ ...columnMapping, [csvCol]: e.target.value })}
                        style={{
                          flex: 1,
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          background: columnMapping[csvCol] === 'title' || columnMapping[csvCol] === 'creator' ? '#fff3cd' : '#fff'
                        }}
                      >
                        <option value="">-- Skip --</option>
                        <option value="title">Title *</option>
                        <option value="creator">Creator *</option>
                        <option value="date">Date</option>
                        <option value="topics">Topics (comma-separated)</option>
                        <option value="format">Format</option>
                        <option value="questionCount">Question Count</option>
                        <option value="difficulty">Difficulty</option>
                        <option value="types">Types (comma-separated)</option>
                        <option value="description">Description</option>
                        <option value="answer">Answer / Correct Answer</option>
                      </select>
                    </div>
                  ))}
                </div>

                <h3 style={{ marginBottom: '15px' }}>Preview (first 5 rows)</h3>
                <div style={{
                  overflowX: 'auto',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        {Object.keys(preview[0] || {}).map(col => (
                          <th key={col} style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, idx) => (
                        <tr key={idx}>
                          {Object.values(row).map((cell: any, cellIdx) => (
                            <td key={cellIdx} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                              {String(cell || '').substring(0, 50)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {result && (
              <div style={{
                padding: '15px',
                borderRadius: '4px',
                marginBottom: '20px',
                background: result.success ? '#e8f5e9' : '#ffebee',
                color: result.success ? '#2e7d32' : '#c62828'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '10px' }}>
                  {result.success ? '✓ Import Complete' : '✗ Import Failed'}
                </div>
                <div>{result.message}</div>
                {result.errors.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <strong>Errors:</strong>
                    <button
                      onClick={() => setShowDebug(!showDebug)}
                      style={{
                        marginLeft: '10px',
                        padding: '4px 8px',
                        background: '#666',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      {showDebug ? 'Hide' : 'Show'} Debug Info
                    </button>
                    {showDebug && result.debug && (
                      <pre style={{
                        marginTop: '10px',
                        padding: '10px',
                        background: '#f5f5f5',
                        borderRadius: '4px',
                        fontSize: '12px',
                        overflow: 'auto'
                      }}>
                        {JSON.stringify(result.debug, null, 2)}
                      </pre>
                    )}
                    <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                      {result.errors.slice(0, 10).map((error, idx) => (
                        <li key={idx} style={{ fontSize: '14px' }}>{error}</li>
                      ))}
                      {result.errors.length > 10 && (
                        <li style={{ fontSize: '14px' }}>... and {result.errors.length - 10} more errors</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
              <button
                onClick={handleImport}
                disabled={!file || importing || preview.length === 0}
                style={{
                  padding: '12px 24px',
                  background: (!file || importing || preview.length === 0) ? '#ccc' : '#0066cc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  cursor: (!file || importing || preview.length === 0) ? 'not-allowed' : 'pointer',
                  flex: 1
                }}
              >
                {importing ? 'Importing...' : `Import ${fileType === 'excel' ? 'Excel' : 'CSV'}`}
              </button>
              <button
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
          </div>
        </div>
      </main>
    </div>
  );
}
