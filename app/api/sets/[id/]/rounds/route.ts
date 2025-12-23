import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, addRoundToSet } from '@/lib/db';

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
    
    if (!body.roundId) {
      return NextResponse.json(
        { success: false, error: 'roundId is required' },
        { status: 400 }
      );
    }
    
    await addRoundToSet(body.roundId, setId, body.sequence || 0);
    
    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Error adding round to set:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add round to set' },
      { status: 500 }
    );
  }
}

