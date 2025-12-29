import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, addQuestionToRound } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDatabase();
    const roundId = parseInt(params.id);
    const body = await request.json();
    
    if (isNaN(roundId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid round ID' },
        { status: 400 }
      );
    }
    
    if (!body.questionId) {
      return NextResponse.json(
        { success: false, error: 'questionId is required' },
        { status: 400 }
      );
    }
    
    await addQuestionToRound(body.questionId, roundId, body.sequence || 0);
    
    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Error adding question to round:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add question to round' },
      { status: 500 }
    );
  }
}


