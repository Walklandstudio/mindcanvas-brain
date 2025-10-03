// app/api/submissions/[id]/person/route.ts
// Adds the missing POST handler so /api/submissions/:id/person accepts POST.
// This fixes the 405 you were seeing.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

type Body = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  test_slug?: string;
};

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) {
    throw new Error("Missing Supabase env vars");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Body;

    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

    // Very light validation
    const { first_name, last_name, email, phone } = body ?? {};
    if (!first_name || !last_name || !email || !phone) {
      return NextResponse.json({ error: "missing required fields" }, { status: 400 });
    }

    const sb = supabaseAdmin();

    // Make sure the submission exists, then update its person fields.
    const { error } = await sb
      .from("mc_submissions")
      .update({
        first_name,
        last_name,
        email,
        phone,
        // optional: so you can backfill if needed later
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}
