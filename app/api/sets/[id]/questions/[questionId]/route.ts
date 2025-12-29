import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, addQuestionToSet, removeQuestionFromSet } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    await initDatabase();
    const setId = parseInt(params.id);
    const questionId = parseInt(params.questionId);
    
    if (isNaN(setId) || isNaN(questionId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid set or question ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const sequence = body.sequence ?? 0;
    
    await addQuestionToSet(questionId, setId, sequence);
    
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
    const setId = parseInt(params.id);
    const questionId = parseInt(params.questionId);
    
    if (isNaN(setId) || isNaN(questionId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid set or question ID' },
        { status: 400 }
      );
    }

    await removeQuestionFromSet(questionId, setId);
    
    return NextResponse.json({
      success: true,
      message: 'Question removed from set'
    });
  } catch (error) {
    console.error('Error removing question from set:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove question from set' },
      { status: 500 }
    );
  }
}
