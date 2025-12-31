import { NextResponse } from 'next/server';
import { getAllCreators, initDatabase, pool } from '@/lib/db';
import { loadAllContent, getAllCreators as getAllFileCreators } from '@/lib/content';

export async function GET() {
  try {
    let creators;
    try {
      await initDatabase();
      const client = await pool.connect();
      try {
        // Diagnostic query to check data
        const diagnosticResult = await client.query(`
          SELECT 
            COUNT(*) as total_items,
            COUNT(CASE WHEN creator IS NOT NULL AND creator != '' THEN 1 END) as items_with_creators,
            COUNT(DISTINCT creator) as unique_creators
          FROM content_items
        `);
        console.log('[Creators API] Diagnostic data:', diagnosticResult.rows[0]);
        
        const sampleResult = await client.query(`
          SELECT DISTINCT creator, COUNT(*) as count
          FROM content_items
          WHERE creator IS NOT NULL AND creator != ''
          GROUP BY creator
          ORDER BY creator
          LIMIT 10
        `);
        console.log('[Creators API] Sample creator data:', JSON.stringify(sampleResult.rows, null, 2));
        
        // Test the actual query used by getAllCreators
        const testResult = await client.query(`
          SELECT DISTINCT creator
          FROM content_items
          WHERE creator IS NOT NULL
            AND creator != ''
            AND trim(creator) != ''
          ORDER BY creator
        `);
        console.log('[Creators API] Test query result:', JSON.stringify(testResult.rows, null, 2));
      } finally {
        client.release();
      }
      
      // Call getAllCreators but also do a direct query to compare
      try {
        creators = await getAllCreators();
        console.log(`[Creators API] getAllCreators() returned ${creators.length} creators:`, creators);
      } catch (getAllCreatorsError) {
        console.error('[Creators API] Error calling getAllCreators():', getAllCreatorsError);
        // Fallback to direct query
        const fallbackClient = await pool.connect();
        try {
          const fallbackResult = await fallbackClient.query(`
            SELECT DISTINCT creator
            FROM content_items
            WHERE creator IS NOT NULL
              AND creator != ''
              AND trim(creator) != ''
            ORDER BY creator
          `);
          creators = fallbackResult.rows.map(row => row.creator).filter((c): c is string => 
            c !== null && c !== undefined && typeof c === 'string' && c.trim() !== ''
          );
          console.log(`[Creators API] Fallback query returned ${creators.length} creators:`, creators);
        } finally {
          fallbackClient.release();
        }
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
