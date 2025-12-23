import { NextRequest, NextResponse } from 'next/server';
import { getAllContent, filterContent, initDatabase, pool } from '@/lib/db';
import { loadAllContent, filterContent as filterFileContent } from '@/lib/content';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const topics = searchParams.get('topics')?.split(',');
    const creator = searchParams.get('creator');
    const difficulty = searchParams.get('difficulty');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;
    
    // Try database first, fallback to file system
    let content: any[];
    let totalCount: number;
    
    try {
      await initDatabase();
      const { pool } = await import('@/lib/db');
      const client = await pool.connect();
      try {
        // Build query with filters
        let query = 'SELECT * FROM content_items WHERE 1=1';
        const params: any[] = [];
        let paramCount = 1;

        if (topics && topics.length > 0) {
          query += ` AND topics && $${paramCount}`;
          params.push(topics.filter(Boolean));
          paramCount++;
        }
        if (creator) {
          query += ` AND LOWER(creator) = LOWER($${paramCount})`;
          params.push(creator);
          paramCount++;
        }
        if (difficulty) {
          query += ` AND difficulty = $${paramCount}`;
          params.push(difficulty);
          paramCount++;
        }
        if (search) {
          query += ` AND (
            LOWER(title) LIKE $${paramCount} OR
            LOWER(description) LIKE $${paramCount} OR
            LOWER(creator) LIKE $${paramCount} OR
            EXISTS (SELECT 1 FROM unnest(topics) AS topic WHERE LOWER(topic) LIKE $${paramCount})
          )`;
          params.push(`%${search.toLowerCase()}%`);
          paramCount++;
        }

        // Get total count
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
        const countResult = await client.query(countQuery, params);
        totalCount = parseInt(countResult.rows[0].count);

        // Get paginated results
        query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);
        const result = await client.query(query, params);
        
        content = result.rows.map(row => ({
          id: `db-${row.id}`,
          path: row.file_paths?.[0]?.split('/').slice(0, -1).join('/') || '',
          metadata: {
            title: row.title || undefined, // Deprecated - kept for backward compatibility
            creator: row.creator || undefined,
            date: row.date || undefined,
            topics: row.topics || undefined,
            questionCount: row.question_count || undefined,
            difficulty: row.difficulty || undefined,
            types: row.types || undefined,
            question: row.description || undefined,
            description: row.description || undefined, // Backward compatibility
            answer: row.answer || undefined,
            correctAnswer: row.answer || undefined,
            options: row.options || undefined,
            points: row.points || undefined,
            timer: row.timer || undefined,
            round: row.round || undefined,
            set: row.set || undefined,
            explanation: row.explanation || undefined,
            notes: row.notes || undefined,
            alternateAnswers: row.alternate_answers || undefined,
            language: row.language || undefined,
            license: row.license || undefined,
            source: row.source || undefined,
            tags: row.tags || undefined,
            files: row.files || undefined,
          },
          files: row.file_paths || []
        }));
      } finally {
        client.release();
      }
    } catch (dbError) {
      console.warn('Database not available, using file system:', dbError);
      // Fallback to file system (limited pagination)
      let fileContent = loadAllContent();
      if (topics || creator || difficulty) {
        fileContent = filterFileContent(fileContent, {
          topics: topics?.filter(Boolean),
          creator: creator || undefined,
          difficulty: difficulty || undefined,
        });
      }
      if (search) {
        const query = search.toLowerCase();
        fileContent = fileContent.filter(item => {
          const { metadata } = item;
          if (metadata.title?.toLowerCase().includes(query)) return true;
          if (metadata.question?.toLowerCase().includes(query)) return true;
          if (metadata.description?.toLowerCase().includes(query)) return true; // Backward compatibility
          if (metadata.creator?.toLowerCase().includes(query)) return true;
          if (metadata.topics?.some(topic => topic.toLowerCase().includes(query))) return true;
          return false;
        });
      }
      totalCount = fileContent.length;
      content = fileContent.slice(offset, offset + limit);
    }
    
    return NextResponse.json({
      success: true,
      count: content.length,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
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
