import { NextResponse } from 'next/server';
import { getAllTopics, initDatabase } from '@/lib/db';
import { loadAllContent, getAllTopics as getAllFileTopics } from '@/lib/content';

export async function GET() {
  try {
    let topics;
    try {
      await initDatabase();
      topics = await getAllTopics();
    } catch (dbError) {
      console.warn('Database not available, using file system:', dbError);
      const content = loadAllContent();
      topics = getAllFileTopics(content);
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
