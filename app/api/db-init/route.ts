import { NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db';

export async function GET() {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: false,
        error: 'DATABASE_URL environment variable is not set. Please add PostgreSQL database in Railway.',
        hint: 'Go to Railway → Add Database → PostgreSQL'
      }, { status: 400 });
    }

    await initDatabase();
    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      tablesCreated: true
    });
  } catch (error) {
    console.error('Error initializing database:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage || 'Failed to initialize database',
        details: errorStack,
        hint: 'Make sure PostgreSQL database is added in Railway and DATABASE_URL is set'
      },
      { status: 500 }
    );
  }
}
