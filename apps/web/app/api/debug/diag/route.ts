// apps/web/app/api/debug/diag/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const projectRef = url.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i)?.[1] || null;

  return NextResponse.json({
    supabaseUrl: url,
    projectRef,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    appOrigin: process.env.APP_ORIGIN || null,
    nodeEnv: process.env.NODE_ENV || null,
  });
}
