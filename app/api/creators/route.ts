import { NextResponse } from 'next/server';
import { loadAllContent, getAllCreators } from '@/lib/content';

export async function GET() {
  try {
    const content = loadAllContent();
    const creators = getAllCreators(content);
    
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

