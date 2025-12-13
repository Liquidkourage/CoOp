import { NextResponse } from 'next/server';

export async function GET() {
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  const databaseUrlPreview = process.env.DATABASE_URL 
    ? `${process.env.DATABASE_URL.substring(0, 20)}...` 
    : 'not set';
  
  return NextResponse.json({
    DATABASE_URL: hasDatabaseUrl ? 'SET' : 'NOT SET',
    preview: databaseUrlPreview,
    allEnvVars: Object.keys(process.env).filter(key => 
      key.includes('DATABASE') || key.includes('POSTGRES') || key.includes('DB')
    ),
    hint: hasDatabaseUrl 
      ? 'DATABASE_URL is set! Database should work.'
      : 'DATABASE_URL is not set. In Railway: 1) Select your CoOp service, 2) Go to Variables tab, 3) Connect PostgreSQL service, or 4) Manually add DATABASE_URL from PostgreSQL service → Variables → Copy DATABASE_URL'
  });
}

