import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasUrl: !!process.env.TURSO_DATABASE_URL,
    hasToken: !!process.env.TURSO_AUTH_TOKEN,
    urlPreview: process.env.TURSO_DATABASE_URL?.slice(0, 20) ?? 'NOT SET',
    tokenLength: process.env.TURSO_AUTH_TOKEN?.length ?? 0,
  });
}
