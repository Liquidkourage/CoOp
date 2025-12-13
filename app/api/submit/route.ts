import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
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

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'At least one file is required' },
        { status: 400 }
      );
    }

    const creatorName = metadata.creator?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'unknown';
    const baseDir = path.join(process.cwd(), 'creators', creatorName);
    
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    const savedFiles: string[] = [];
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = file.name;
      const filePath = path.join(baseDir, fileName);
      
      fs.writeFileSync(filePath, buffer);
      savedFiles.push(fileName);
    }

    metadata.files = savedFiles;

    const metadataPath = path.join(baseDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

    return NextResponse.json({
      success: true,
      message: 'Content submitted successfully',
      path: `creators/${creatorName}`,
      files: savedFiles
    });
  } catch (error) {
    console.error('Error submitting content:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit content' },
      { status: 500 }
    );
  }
}

