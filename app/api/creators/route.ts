import { NextResponse } from 'next/server';
import { getAllCreators, initDatabase } from '@/lib/db';
import { loadAllContent, getAllCreators as getAllFileCreators } from '@/lib/content';

export async function GET() {
  try {
    let creators;
    try {
      await initDatabase();
      creators = await getAllCreators();
    } catch (dbError) {
      console.warn('Database not available, using file system:', dbError);
      const content = loadAllContent();
      creators = getAllFileCreators(content);
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
