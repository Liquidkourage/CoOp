import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, getRoundById, updateRound, deleteRound, getQuestionsInRound } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDatabase();
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid round ID' },
        { status: 400 }
      );
    }

    const round = await getRoundById(id);
    
    if (!round) {
      return NextResponse.json(
        { success: false, error: 'Round not found' },
        { status: 404 }
      );
    }

    const questions = await getQuestionsInRound(id);
    
    return NextResponse.json({
      success: true,
      round: {
        ...round,
        questions
      }
    });
  } catch (error) {
    console.error('Error loading round:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load round' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDatabase();
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid round ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    const round = await updateRound(id, {
      name: body.name,
      creator: body.creator,
      date: body.date,
      description: body.description,
      topics: body.topics
    });
    
    if (!round) {
      return NextResponse.json(
        { success: false, error: 'Round not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      round
    });
  } catch (error) {
    console.error('Error updating round:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update round' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDatabase();
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid round ID' },
        { status: 400 }
      );
    }

    const round = await getRoundById(id);
    if (!round) {
      return NextResponse.json(
        { success: false, error: 'Round not found' },
        { status: 404 }
      );
    }

    await deleteRound(id);
    
    return NextResponse.json({
      success: true,
      message: 'Round deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting round:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete round' },
      { status: 500 }
    );
  }
}
