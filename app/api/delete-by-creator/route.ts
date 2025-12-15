import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, pool } from '@/lib/db';

export async function DELETE(request: NextRequest) {
  try {
    await initDatabase();
    
    const { searchParams } = request.nextUrl;
    const creator = searchParams.get('creator');
    
    if (!creator) {
      return NextResponse.json(
        { error: 'Creator name is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // First, get the items that will be deleted
      const selectResult = await client.query(
        'SELECT id, title, creator, date FROM content_items WHERE creator = $1',
        [creator]
      );
      
      if (selectResult.rows.length === 0) {
        return NextResponse.json({
          success: true,
          message: `No content found for creator: ${creator}`,
          deletedCount: 0
        });
      }
      
      // Delete the items
      const deleteResult = await client.query(
        'DELETE FROM content_items WHERE creator = $1',
        [creator]
      );
      
      return NextResponse.json({
        success: true,
        message: `Deleted ${deleteResult.rowCount} items for creator: ${creator}`,
        deletedCount: deleteResult.rowCount,
        deletedItems: selectResult.rows.map(row => ({
          id: `db-${row.id}`,
          title: row.title,
          date: row.date
        }))
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting content by creator:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete content' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await initDatabase();
    
    const { searchParams } = request.nextUrl;
    const creator = searchParams.get('creator');
    
    if (!creator) {
      return NextResponse.json(
        { error: 'Creator name is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, title, creator, date, topics FROM content_items WHERE creator = $1 ORDER BY created_at DESC',
        [creator]
      );
      
      return NextResponse.json({
        success: true,
        count: result.rows.length,
        items: result.rows.map(row => ({
          id: `db-${row.id}`,
          title: row.title,
          creator: row.creator,
          date: row.date,
          topics: row.topics
        }))
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching content by creator:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

