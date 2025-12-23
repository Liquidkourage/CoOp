import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, getAllSets, insertSet } from '@/lib/db';

export async function GET() {
  try {
    await initDatabase();
    const sets = await getAllSets();
    
    return NextResponse.json({
      success: true,
      count: sets.length,
      sets
    });
  } catch (error) {
    console.error('Error loading sets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load sets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDatabase();
    const body = await request.json();
    
    const set = await insertSet({
      name: body.name,
      creator: body.creator,
      date: body.date,
      description: body.description,
      topics: body.topics
    });
    
    return NextResponse.json({
      success: true,
      set
    });
  } catch (error) {
    console.error('Error creating set:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create set' },
      { status: 500 }
    );
  }
}

