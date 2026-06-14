import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export async function GET() {
  const hasUrl = !!process.env.TURSO_DATABASE_URL;
  const hasToken = !!process.env.TURSO_AUTH_TOKEN;

  if (!hasUrl || !hasToken) {
    return NextResponse.json({ hasUrl, hasToken, error: 'Missing env vars' });
  }

  try {
    const db = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });

    const result = await db.execute('SELECT COUNT(*) as c FROM comics');
    const seriesResult = await db.execute('SELECT id, name FROM series LIMIT 1');

    return NextResponse.json({
      hasUrl,
      hasToken,
      comicsCount: result.rows[0].c,
      sampleSeries: seriesResult.rows[0],
      status: 'OK',
    });
  } catch (e: unknown) {
    return NextResponse.json({
      hasUrl,
      hasToken,
      error: e instanceof Error ? e.message : String(e),
      errorName: e instanceof Error ? e.name : 'unknown',
    }, { status: 500 });
  }
}
