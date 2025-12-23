import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, getSetById, getQuestionsInSet, getRoundsInSet } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDatabase();
    const setId = parseInt(params.id);
    
    if (isNaN(setId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid set ID' },
        { status: 400 }
      );
    }
    
    const set = await getSetById(setId);
    if (!set) {
      return NextResponse.json(
        { success: false, error: 'Set not found' },
        { status: 404 }
      );
    }
    
    const questions = await getQuestionsInSet(setId);
    const rounds = await getRoundsInSet(setId);
    
    return NextResponse.json({
      success: true,
      set,
      questions,
      rounds
    });
  } catch (error) {
    console.error('Error loading set:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load set' },
      { status: 500 }
    );
  }
}

