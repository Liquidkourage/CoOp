import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, pool } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function DELETE(request: NextRequest) {
  try {
    await initDatabase();
    
    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    // Check if it's a database record (starts with 'db-')
    if (id.startsWith('db-')) {
      const dbId = parseInt(id.replace('db-', ''));
      const client = await pool.connect();
      try {
        await client.query('DELETE FROM content_items WHERE id = $1', [dbId]);
        return NextResponse.json({ success: true, message: 'Content deleted successfully' });
      } finally {
        client.release();
      }
    } else {
      // File-based deletion
      // Find the metadata file and delete the directory
      const repoRoot = process.cwd();
      const contentDirs = ['creators', 'topics', 'archive', 'formats'];
      
      for (const dir of contentDirs) {
        const dirPath = path.join(repoRoot, dir);
        if (fs.existsSync(dirPath)) {
          const entries = fs.readdirSync(dirPath, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const metadataPath = path.join(dirPath, entry.name, 'metadata.json');
              if (fs.existsSync(metadataPath)) {
                try {
                  const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
                  const metadata = JSON.parse(metadataContent);
                  const itemId = metadataPath.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
                  
                  if (itemId === id) {
                    // Delete the entire directory
                    const itemDir = path.dirname(metadataPath);
                    fs.rmSync(itemDir, { recursive: true, force: true });
                    return NextResponse.json({ success: true, message: 'Content deleted successfully' });
                  }
                } catch (e) {
                  // Continue searching
                }
              }
            }
          }
        }
      }
      
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error deleting content:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete content' },
      { status: 500 }
    );
  }
}

