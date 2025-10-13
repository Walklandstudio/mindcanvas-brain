// app/api/admin/session/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';

const ADMIN_COOKIE = 'admin_token';
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password ?? '';

  const expected = process.env.ADMIN_DASH_TOKEN ?? '';
  if (!expected) {
    return NextResponse.json(
      { error: 'Server misconfiguration: ADMIN_DASH_TOKEN not set' },
      { status: 500 }
    );
  }

  if (password !== expected) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, expected, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
  return res;
}
