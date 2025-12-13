import { NextRequest, NextResponse } from 'next/server';
import { loadAllContent, searchContent } from '@/lib/content';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }
    
    const allContent = loadAllContent();
    const results = searchContent(query, allContent);
    
    return NextResponse.json({
      success: true,
      query,
      count: results.length,
      results
    });
  } catch (error) {
    console.error('Error searching content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search content' },
      { status: 500 }
    );
  }
}

