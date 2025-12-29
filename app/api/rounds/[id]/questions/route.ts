import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, getRoundById, addQuestionToRound } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDatabase();
    const roundId = parseInt(params.id);
    
    if (isNaN(roundId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid round ID' },
        { status: 400 }
      );
    }
    
    // Verify round exists
    const round = await getRoundById(roundId);
    if (!round) {
      return NextResponse.json(
        { success: false, error: 'Round not found' },
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
    
    await addQuestionToRound(questionId, roundId, sequence);
    
    return NextResponse.json({
      success: true,
      message: 'Question added to round'
    });
  } catch (error) {
    console.error('Error adding question to round:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add question to round' },
      { status: 500 }
    );
  }
}

