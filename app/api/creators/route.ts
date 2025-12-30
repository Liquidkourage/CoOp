import { NextResponse } from 'next/server';
import { getAllCreators, initDatabase, pool } from '@/lib/db';
import { loadAllContent, getAllCreators as getAllFileCreators } from '@/lib/content';

export async function GET() {
  try {
    let creators;
    try {
      await initDatabase();
      
      // Diagnostic query to check data
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
          rejectUnauthorized: false
        }
      });
      
      const client = await pool.connect();
      try {
        // Sample some actual creator data
        const sampleResult = await client.query(`
          SELECT DISTINCT creator, COUNT(*) as count
          FROM content_items
          WHERE creator IS NOT NULL
          GROUP BY creator
          LIMIT 10
        `);
        console.log('[Creators API] Sample creator data:', JSON.stringify(sampleResult.rows, null, 2));
      } finally {
        client.release();
      }
      
      creators = await getAllCreators();
      console.log(`[Creators API] Found ${creators.length} creators from database:`, creators);
    } catch (dbError) {
      console.warn('Database not available, using file system:', dbError);
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
      { success: false, error: 'Failed to load creators' },
      { status: 500 }
    );
  }
}
