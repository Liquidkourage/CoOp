import { NextResponse } from 'next/server';
import { loadAllContent, getAllTopics } from '@/lib/content';

export async function GET() {
  try {
    const content = loadAllContent();
    const topics = getAllTopics(content);
    
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

