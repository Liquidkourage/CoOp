import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, getSetById, getQuestionsInSet, getRoundsInSet } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDatabase();
    const id = parseInt(params.id);
    
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
        })),
        rounds: rounds.map(r => ({
          id: r.id,
          name: r.name,
          creator: r.creator,
          date: r.date,
          description: r.description,
          topics: r.topics,
          sequence: r.sequence
        }))
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

