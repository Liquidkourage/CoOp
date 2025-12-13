import { NextRequest, NextResponse } from 'next/server';
import { loadAllContent, filterContent } from '@/lib/content';

export async function GET(request: NextRequest) {
  try {
    let content = loadAllContent();
    
    const searchParams = request.nextUrl.searchParams;
    const topics = searchParams.get('topics')?.split(',');
    const creator = searchParams.get('creator');
    const difficulty = searchParams.get('difficulty');
    const types = searchParams.get('types')?.split(',');
    const format = searchParams.get('format');
    
    if (topics || creator || difficulty || types || format) {
      content = filterContent(content, {
        topics: topics?.filter(Boolean),
        creator: creator || undefined,
        difficulty: difficulty || undefined,
        types: types?.filter(Boolean),
        format: format || undefined,
      });
    }
    
    return NextResponse.json({
      success: true,
      count: content.length,
      content
    });
  } catch (error) {
    console.error('Error loading content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load content' },
      { status: 500 }
    );
  }
}

