// app/api/tests/submissions/route.ts
import { NextResponse } from "next/server";
// import { supabase } from "@/lib/supabaseServer";

export async function POST() {
  // If you need the body later:
  // export async function POST(req: Request) { const payload = await req.json(); ... }
  return NextResponse.json({ ok: true });
}
