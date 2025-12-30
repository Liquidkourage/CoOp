import { NextResponse } from 'next/server';
import { initDatabase, pool } from '@/lib/db';

export async function GET() {
  try {
    await initDatabase();
    const client = await pool.connect();
    
    try {
      // Get sample of actual data
      const sampleQuery = await client.query(`
        SELECT 
          id,
          creator,
          topics,
          array_length(topics, 1) as topics_length,
          CASE 
            WHEN topics IS NULL THEN 'NULL'
            WHEN array_length(topics, 1) IS NULL THEN 'EMPTY_ARRAY'
            ELSE 'HAS_TOPICS'
          END as topics_status
        FROM content_items
        LIMIT 10
      `);
      
      // Count statistics
      const statsQuery = await client.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN creator IS NOT NULL AND creator != '' THEN 1 END) as has_creator,
          COUNT(CASE WHEN topics IS NOT NULL AND array_length(topics, 1) > 0 THEN 1 END) as has_topics,
          COUNT(CASE WHEN topics IS NULL THEN 1 END) as topics_null,
          COUNT(CASE WHEN topics IS NOT NULL AND array_length(topics, 1) = 0 THEN 1 END) as topics_empty_array
        FROM content_items
      `);
      
      // Get distinct creators
      const creatorsQuery = await client.query(`
        SELECT DISTINCT creator
        FROM content_items
        WHERE creator IS NOT NULL AND creator != ''
        LIMIT 20
      `);
      
      // Get all topics using unnest
      const topicsQuery = await client.query(`
        SELECT DISTINCT unnest(topics) AS topic
        FROM content_items
        WHERE topics IS NOT NULL 
          AND array_length(topics, 1) > 0
        LIMIT 20
      `);
      
      return NextResponse.json({
        success: true,
        stats: statsQuery.rows[0],
        sample: sampleQuery.rows,
        creators: creatorsQuery.rows.map(r => r.creator),
        topics: topicsQuery.rows.map(r => r.topic),
        rawCreators: creatorsQuery.rows,
        rawTopics: topicsQuery.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Debug data error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

