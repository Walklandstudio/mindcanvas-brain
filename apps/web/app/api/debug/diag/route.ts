// apps/web/app/api/debug/diag/route.ts
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getServerSupabase } from '@/app/_lib/portal';

export const runtime = 'nodejs';

export async function GET() {
  const h = await headers();
  const host = h.get('host');
  const proto = h.get('x-forwarded-proto');
  let email: string | null = null;
  let envErr: string | null = null;

  try {
    const sb = await getServerSupabase();
    const { data: { user } } = await sb.auth.getUser();
    email = user?.email ?? null;
  } catch (e: any) {
    envErr = e?.message || String(e);
  }

  return NextResponse.json({
    ok: true,
    host,
    proto,
    envCheck: envErr ?? 'OK',
    env: {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      APP_ORIGIN: process.env.APP_ORIGIN || null,
      PLATFORM_ADMINS: process.env.PLATFORM_ADMINS || null,
    },
    sessionEmail: email,
  });
}
