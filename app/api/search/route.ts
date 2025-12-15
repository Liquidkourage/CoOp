import { NextRequest, NextResponse } from 'next/server';
import { searchContent, initDatabase } from '@/lib/db';
import { loadAllContent, searchContent as searchFileContent } from '@/lib/content';

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
    
    let results;
    try {
      await initDatabase();
      const dbResults = await searchContent(query);
      results = dbResults.map(row => ({
        id: `db-${row.id}`,
        path: row.file_paths?.[0]?.split('/').slice(0, -1).join('/') || '',
        metadata: {
          title: row.title || undefined,
          creator: row.creator || undefined,
          date: row.date || undefined,
          topics: row.topics || undefined,
          questionCount: row.question_count || undefined,
          difficulty: row.difficulty || undefined,
          types: row.types || undefined,
          description: row.description || undefined,
          language: row.language || undefined,
          license: row.license || undefined,
          source: row.source || undefined,
          tags: row.tags || undefined,
          files: row.files || undefined,
        },
        files: row.file_paths || []
      }));
    } catch (dbError) {
      console.warn('Database not available, using file system:', dbError);
      const allContent = loadAllContent();
      results = searchFileContent(query, allContent);
    }
    
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
