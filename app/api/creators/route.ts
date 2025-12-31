import { NextResponse } from 'next/server';
import { getAllCreators, initDatabase, pool } from '@/lib/db';
import { loadAllContent, getAllCreators as getAllFileCreators } from '@/lib/content';

export async function GET() {
  try {
    let creators: string[] = [];
    try {
      await initDatabase();
      const client = await pool.connect();
      try {
        // Use the same query that works in debug-data
        const result = await client.query(`
          SELECT DISTINCT creator
          FROM content_items
          WHERE creator IS NOT NULL 
            AND creator != ''
            AND trim(creator) != ''
          ORDER BY creator
        `);
        
        creators = result.rows
          .map(row => row.creator)
          .filter((creator): creator is string => 
            creator !== null && creator !== undefined && typeof creator === 'string' && creator.trim() !== ''
          );
        
        console.log(`[Creators API] Found ${creators.length} creators:`, creators);
      } finally {
        client.release();
      }
    } catch (dbError) {
      console.warn('Database not available, using file system:', dbError);
      console.error('Database error details:', dbError);
      const content = loadAllContent();
      creators = getAllFileCreators(content);
      console.log(`[Creators API] Found ${creators.length} creators from file system:`, creators);
    }
    
    return NextResponse.json({
      success: true,
      count: creators.length,
      creators
    });
  } catch (error) {
    console.error('Error loading creators:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load creators', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
