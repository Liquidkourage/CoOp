import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, pool } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    await initDatabase();
    const client = await pool.connect();
    
    let deletedCount = 0;
    const errors: string[] = [];
    
    try {
      // Delete from database
      const result = await client.query(`
        DELETE FROM content_items 
        WHERE answer IS NULL OR answer = ''
        RETURNING id
      `);
      deletedCount += result.rowCount || 0;
    } catch (dbError) {
      console.warn('Database cleanup failed, trying file system:', dbError);
    } finally {
      client.release();
    }
    
    // Also clean up file-based content
    try {
      const repoRoot = process.cwd();
      const contentDirs = ['creators', 'topics', 'archive', 'formats'];
      
      for (const dir of contentDirs) {
        const dirPath = path.join(repoRoot, dir);
        if (!fs.existsSync(dirPath)) continue;
        
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const metadataPath = path.join(dirPath, entry.name, 'metadata.json');
            if (fs.existsSync(metadataPath)) {
              try {
                const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
                const metadata = JSON.parse(metadataContent);
                
                // Check if answer is missing or empty
                const hasAnswer = metadata.answer || metadata.correctAnswer;
                if (!hasAnswer || hasAnswer.trim() === '') {
                  // Delete the entire directory
                  const itemDir = path.dirname(metadataPath);
                  fs.rmSync(itemDir, { recursive: true, force: true });
                  deletedCount++;
                }
              } catch (e) {
                errors.push(`Error processing ${metadataPath}: ${e instanceof Error ? e.message : 'Unknown error'}`);
              }
            }
          }
        }
      }
    } catch (fileError) {
      errors.push(`File system cleanup error: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
    }
    
    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Deleted ${deletedCount} entries without answers`
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cleanup entries'
      },
      { status: 500 }
    );
  }
}

