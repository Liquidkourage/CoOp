import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, getSetById, updateSet, deleteSet, getQuestionsInSet, getRoundsInSet } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDatabase();
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid set ID' },
        { status: 400 }
      );
    }

    const set = await getSetById(id);
    
    if (!set) {
      return NextResponse.json(
        { success: false, error: 'Set not found' },
        { status: 404 }
      );
    }

    const questions = await getQuestionsInSet(id);
    const rounds = await getRoundsInSet(id);
    
    return NextResponse.json({
      success: true,
      set: {
        ...set,
        questions,
        rounds
      }
    });
  } catch (error) {
    console.error('Error loading set:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load set' },
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
        { success: false, error: 'Invalid set ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    const set = await updateSet(id, {
      name: body.name,
      creator: body.creator,
      date: body.date,
      description: body.description,
      topics: body.topics
    });
    
    if (!set) {
      return NextResponse.json(
        { success: false, error: 'Set not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      set
    });
  } catch (error) {
    console.error('Error updating set:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update set' },
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
        { success: false, error: 'Invalid set ID' },
        { status: 400 }
      );
    }

    const set = await getSetById(id);
    if (!set) {
      return NextResponse.json(
        { success: false, error: 'Set not found' },
        { status: 404 }
      );
    }

    await deleteSet(id);
    
    return NextResponse.json({
      success: true,
      message: 'Set deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting set:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete set' },
      { status: 500 }
    );
  }
}
