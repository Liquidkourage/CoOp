import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, addQuestionToSet } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDatabase();
    const setId = parseInt(params.id);
    const body = await request.json();
    
    if (isNaN(setId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid set ID' },
        { status: 400 }
      );
    }
    
    if (!body.questionId) {
      return NextResponse.json(
        { success: false, error: 'questionId is required' },
        { status: 400 }
      );
    }
    
    await addQuestionToSet(body.questionId, setId, body.sequence || 0);
    
    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Error adding question to set:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add question to set' },
      { status: 500 }
    );
  }
}


