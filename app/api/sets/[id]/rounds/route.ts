import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, getSetById, addRoundToSet } from '@/lib/db';

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
    const roundId = body.roundId;
    const sequence = body.sequence ?? 0;
    
    if (!roundId || typeof roundId !== 'number') {
      return NextResponse.json(
        { success: false, error: 'roundId is required' },
        { status: 400 }
      );
    }
    
    await addRoundToSet(roundId, setId, sequence);
    
    return NextResponse.json({
      success: true,
      message: 'Round added to set'
    });
  } catch (error) {
    console.error('Error adding round to set:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add round to set' },
      { status: 500 }
    );
  }
}

