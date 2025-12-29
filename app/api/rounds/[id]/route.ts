import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, getRoundById, getQuestionsInRound } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDatabase();
    const id = parseInt(params.id);
    
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
        questions: questions.map(q => ({
          id: q.id,
          question: q.description,
          answer: q.answer,
          points: q.points,
          timer: q.timer,
          explanation: q.explanation,
          notes: q.notes,
          alternateAnswers: q.alternate_answers,
          topics: q.topics,
          difficulty: q.difficulty,
          sequence: q.sequence
        }))
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

