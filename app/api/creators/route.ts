import { NextResponse } from 'next/server';
import { initDatabase, pool } from '@/lib/db';
import { loadAllContent, getAllCreators as getAllFileCreators } from '@/lib/content';

// Force dynamic rendering and prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    let creators: string[] = [];
    try {
      await initDatabase();
      const client = await pool.connect();
      try {
        // Use the exact same query that works in debug-data
        const result = await client.query(`
          SELECT DISTINCT creator
          FROM content_items
          WHERE creator IS NOT NULL 
            AND creator != ''
            AND trim(creator) != ''
          ORDER BY creator
        `);
        
        console.log(`[Creators API] Query returned ${result.rows.length} rows:`, JSON.stringify(result.rows, null, 2));
        
        creators = result.rows
          .map(row => row.creator)
          .filter((creator): creator is string => 
            creator !== null && creator !== undefined && typeof creator === 'string' && creator.trim() !== ''
          );
        
        console.log(`[Creators API] After filtering, found ${creators.length} creators:`, creators);
      } catch (queryError) {
        console.error('[Creators API] Query error:', queryError);
        throw queryError;
      } finally {
        client.release();
      }
    } catch (dbError) {
      console.warn('[Creators API] Database not available, using file system:', dbError);
      console.error('[Creators API] Database error details:', dbError);
      const content = loadAllContent();
      creators = getAllFileCreators(content);
      console.log(`[Creators API] Found ${creators.length} creators from file system:`, creators);
    }
    
    const response = {
      success: true,
      count: creators.length,
      creators
    };
    console.log('[Creators API] Returning response:', JSON.stringify(response, null, 2));
    
    // Prevent caching
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('[Creators API] Error loading creators:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load creators', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
