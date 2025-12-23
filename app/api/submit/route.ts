import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { insertContent, initDatabase } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Initialize database if needed
    await initDatabase();

    const formData = await request.formData();
    const metadataStr = formData.get('metadata') as string;
    
    if (!metadataStr) {
      return NextResponse.json(
        { error: 'Metadata is required' },
        { status: 400 }
      );
    }

    const metadata = JSON.parse(metadataStr);
    const files = formData.getAll('files') as File[];

    const creatorName = metadata.creator?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'unknown';
    const baseDir = path.join(process.cwd(), 'uploads', creatorName);
    
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    const savedFiles: string[] = [];
    const filePaths: string[] = [];
    
    // Files are optional (for CSV imports)
    if (files.length > 0) {
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fileName = file.name;
        const filePath = path.join(baseDir, fileName);
        
        fs.writeFileSync(filePath, buffer);
        savedFiles.push(fileName);
        filePaths.push(`uploads/${creatorName}/${fileName}`);
      }
    }

    // Save to database
    const dbRecord = await insertContent({
      // Title removed - individual questions never need titles
      creator: metadata.creator,
      date: metadata.date,
      topics: metadata.topics,
      questionCount: metadata.questionCount,
      difficulty: metadata.difficulty,
      types: metadata.types,
      question: metadata.question || metadata.description, // Support both 'question' and 'description'
      description: metadata.description || metadata.question, // Backward compatibility
      answer: metadata.correctAnswer || metadata.answer,
      options: metadata.options, // Structured options array for multiple-choice questions
      points: metadata.points,
      timer: metadata.timer,
      round: metadata.round,
      set: metadata.set,
      explanation: metadata.explanation,
      notes: metadata.notes,
      alternateAnswers: metadata.alternateAnswers,
      language: metadata.language,
      license: metadata.license,
      source: metadata.source,
      tags: metadata.tags,
      files: savedFiles,
      filePaths: filePaths
    });

    return NextResponse.json({
      success: true,
      message: 'Content submitted successfully',
      id: dbRecord.id,
      path: `uploads/${creatorName}`,
      files: savedFiles
    });
  } catch (error) {
    console.error('Error submitting content:', error);
    // If database fails, try file-based fallback
    try {
      const formData = await request.formData();
      const metadataStr = formData.get('metadata') as string;
      const metadata = JSON.parse(metadataStr);
      const files = formData.getAll('files') as File[];

      const creatorName = metadata.creator?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'unknown';
      const baseDir = path.join(process.cwd(), 'creators', creatorName);
      
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }

      const savedFiles: string[] = [];
      // Files are optional (for CSV imports)
      if (files.length > 0) {
        for (const file of files) {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const fileName = file.name;
          const filePath = path.join(baseDir, fileName);
          fs.writeFileSync(filePath, buffer);
          savedFiles.push(fileName);
        }
      }

      metadata.files = savedFiles;
      const metadataPath = path.join(baseDir, 'metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

      return NextResponse.json({
        success: true,
        message: 'Content submitted successfully (file-based fallback)',
        path: `creators/${creatorName}`,
        files: savedFiles
      });
    } catch (fallbackError) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to submit content' },
        { status: 500 }
      );
    }
  }
}
