import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, getSetById, addQuestionToSet } from '@/lib/db';

export async function POST(
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
    
    // Verify set exists
    const set = await getSetById(setId);
    if (!set) {
      return NextResponse.json(
        { success: false, error: 'Set not found' },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    const questionId = body.questionId;
    const sequence = body.sequence ?? 0;
    
    if (!questionId || typeof questionId !== 'number') {
      return NextResponse.json(
        { success: false, error: 'questionId is required' },
        { status: 400 }
      );
    }
    
    await addQuestionToSet(questionId, setId, sequence);
    
    return NextResponse.json({
      success: true,
      message: 'Question added to set'
    });
  } catch (error) {
    console.error('Error adding question to set:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add question to set' },
      { status: 500 }
    );
  }
}

