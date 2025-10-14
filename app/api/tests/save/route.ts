import 'server-only';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Minimal stub to accept test payloads from the builder.
 * Replace with Supabase persistence when ready.
 */
export async function POST(req: Request) {
  try {
    const payload = await req.json();
    // TODO: persist to Supabase (tests + test_questions tables)
    // For now we just echo and return success.
    return NextResponse.json({ ok: true, received: payload });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Bad request' }, { status: 400 });
  }
}
