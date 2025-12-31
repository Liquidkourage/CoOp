import { NextResponse } from 'next/server';
import { getAllTopics, initDatabase, pool } from '@/lib/db';
import { loadAllContent, getAllTopics as getAllFileTopics } from '@/lib/content';

// Force dynamic rendering and prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    let topics: string[] = [];
    try {
      await initDatabase();
      const client = await pool.connect();
      try {
        // Use the same query that works in debug-data
        const result = await client.query(`
          SELECT DISTINCT unnest(topics) AS topic
          FROM content_items
          WHERE topics IS NOT NULL 
            AND array_length(topics, 1) > 0
          ORDER BY topic
        `);
        
        console.log(`[Topics API] Query returned ${result.rows.length} rows:`, JSON.stringify(result.rows, null, 2));
        
        topics = result.rows
          .map(row => row.topic)
          .filter((topic): topic is string => 
            topic !== null && topic !== undefined && typeof topic === 'string' && topic.trim() !== ''
          );
        
        console.log(`[Topics API] After filtering, found ${topics.length} topics:`, topics);
      } catch (queryError) {
        console.error('[Topics API] Query error:', queryError);
        throw queryError;
      } finally {
        client.release();
      }
    } catch (dbError) {
      console.warn('[Topics API] Database not available, using file system:', dbError);
      console.error('[Topics API] Database error details:', dbError);
      const content = loadAllContent();
      topics = getAllFileTopics(content);
      console.log(`[Topics API] Found ${topics.length} topics from file system:`, topics);
    }
    
    const response = {
      success: true,
      count: topics.length,
      topics
    };
    console.log('[Topics API] Returning response:', JSON.stringify(response, null, 2));
    
    // Prevent caching
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('[Topics API] Error loading topics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load topics', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
