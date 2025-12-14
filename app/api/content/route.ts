import { NextRequest, NextResponse } from 'next/server';
import { getAllContent, filterContent, initDatabase } from '@/lib/db';
import { loadAllContent, filterContent as filterFileContent } from '@/lib/content';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const topics = searchParams.get('topics')?.split(',');
    const creator = searchParams.get('creator');
    const difficulty = searchParams.get('difficulty');
    const format = searchParams.get('format');
    
    // Try database first, fallback to file system
    let content;
    try {
      await initDatabase();
      const dbContent = await getAllContent();
      const filtered = await filterContent({
        topics: topics?.filter(Boolean),
        creator: creator || undefined,
        difficulty: difficulty || undefined,
        format: format || undefined,
      });
      
      // Convert database rows to ContentItem format
      content = filtered.map(row => ({
        id: `db-${row.id}`,
        path: row.file_paths?.[0]?.split('/').slice(0, -1).join('/') || '',
        metadata: {
          title: row.title || undefined,
          creator: row.creator || undefined,
          date: row.date || undefined,
          topics: row.topics || undefined,
          format: row.format || undefined,
          questionCount: row.question_count || undefined,
          difficulty: row.difficulty || undefined,
          types: row.types || undefined,
          description: row.description || undefined,
          answer: (row as any).answer || undefined,
          correctAnswer: (row as any).answer || undefined,
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
      // Fallback to file system
      let fileContent = loadAllContent();
      if (topics || creator || difficulty || format) {
        fileContent = filterFileContent(fileContent, {
          topics: topics?.filter(Boolean),
          creator: creator || undefined,
          difficulty: difficulty || undefined,
          format: format || undefined,
        });
      }
      content = fileContent;
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
