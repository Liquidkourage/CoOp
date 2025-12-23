import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, getRoundById, getQuestionsInRound } from '@/lib/db';

export async function GET(
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
    
    const round = await getRoundById(roundId);
    if (!round) {
      return NextResponse.json(
        { success: false, error: 'Round not found' },
        { status: 404 }
      );
    }
    
    const questions = await getQuestionsInRound(roundId);
    
    return NextResponse.json({
      success: true,
      round,
      questions
    });
  } catch (error) {
    console.error('Error loading round:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load round' },
      { status: 500 }
    );
  }
}

