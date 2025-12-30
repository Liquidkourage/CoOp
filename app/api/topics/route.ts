import { NextResponse } from 'next/server';
import { getAllTopics, initDatabase, pool } from '@/lib/db';
import { loadAllContent, getAllTopics as getAllFileTopics } from '@/lib/content';

export async function GET() {
  try {
    let topics;
    try {
      await initDatabase();
      
      // Diagnostic query to check data
      const client = await pool.connect();
      try {
        const diagnosticResult = await client.query(`
          SELECT 
            COUNT(*) as total_items,
            COUNT(CASE WHEN topics IS NOT NULL AND array_length(topics, 1) > 0 THEN 1 END) as items_with_topics,
            COUNT(DISTINCT creator) as unique_creators
          FROM content_items
        `);
        console.log('[Topics API] Diagnostic data:', diagnosticResult.rows[0]);
      } finally {
        client.release();
      }
      
      topics = await getAllTopics();
      console.log(`[Topics API] Found ${topics.length} topics from database:`, topics);
    } catch (dbError) {
      console.warn('Database not available, using file system:', dbError);
      const content = loadAllContent();
      topics = getAllFileTopics(content);
      console.log(`[Topics API] Found ${topics.length} topics from file system:`, topics);
    }
    
    return NextResponse.json({
      success: true,
      count: topics.length,
      topics
    });
  } catch (error) {
    console.error('Error loading topics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load topics' },
      { status: 500 }
    );
  }
}
