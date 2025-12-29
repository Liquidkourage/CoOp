import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, getAllRounds, insertRound } from '@/lib/db';

export async function GET() {
  try {
    await initDatabase();
    const rounds = await getAllRounds();
    
    return NextResponse.json({
      success: true,
      count: rounds.length,
      rounds
    });
  } catch (error) {
    console.error('Error loading rounds:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load rounds' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDatabase();
    const body = await request.json();
    
    const round = await insertRound({
      name: body.name,
      creator: body.creator,
      date: body.date,
      description: body.description,
      topics: body.topics
    });
    
    return NextResponse.json({
      success: true,
      round
    });
  } catch (error) {
    console.error('Error creating round:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create round' },
      { status: 500 }
    );
  }
}


