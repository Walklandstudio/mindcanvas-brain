export const runtime = "nodejs";          // ensure Node, not Edge
export const dynamic = "force-dynamic";   // don't cache

import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const anon = process.env.SUPABASE_ANON_KEY || "";
  const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  const tail = (s:string) => s ? s.slice(-8) : "";
  return NextResponse.json({
    runtime: "nodejs",
    has: {
      SUPABASE_URL: !!url,
      SUPABASE_ANON_KEY: !!anon,
      SUPABASE_SERVICE_ROLE_KEY: !!svc,
    },
    tails: {
      SUPABASE_URL: tail(url),
      SUPABASE_ANON_KEY: tail(anon),
      SUPABASE_SERVICE_ROLE_KEY: tail(svc),
    }
  });
}
