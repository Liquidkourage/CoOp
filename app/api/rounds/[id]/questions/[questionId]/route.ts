import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, addQuestionToRound, removeQuestionFromRound } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    await initDatabase();
    const roundId = parseInt(params.id);
    const questionId = parseInt(params.questionId);
    
    if (isNaN(roundId) || isNaN(questionId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid round or question ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const sequence = body.sequence ?? 0;
    
    await addQuestionToRound(questionId, roundId, sequence);
    
    return NextResponse.json({
      success: true,
      message: 'Question sequence updated'
    });
  } catch (error) {
    console.error('Error updating question sequence:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update question sequence' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    await initDatabase();
    const roundId = parseInt(params.id);
    const questionId = parseInt(params.questionId);
    
    if (isNaN(roundId) || isNaN(questionId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid round or question ID' },
        { status: 400 }
      );
    }

    await removeQuestionFromRound(questionId, roundId);
    
    return NextResponse.json({
      success: true,
      message: 'Question removed from round'
    });
  } catch (error) {
    console.error('Error removing question from round:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove question from round' },
      { status: 500 }
    );
  }
}
