import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

export async function GET(req: Request, { params }: { params: { token: string } }) {
  try {
    const token = params.token;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });
    }

    const sb = supa();

    // 1) Load qsc_results row
    const { data: qscRes, error: qErr } = await sb
      .from("qsc_results")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (qErr || !qscRes) {
      return NextResponse.json({ ok: false, error: "QSC result not found" }, { status: 404 });
    }

    // 2) Load matching QSC profile row
    const { data: profile, error: pErr } = await sb
      .from("qsc_profiles")
      .select("*")
      .eq("id", qscRes.qsc_profile_id)
      .maybeSingle();

    if (pErr) {
      return NextResponse.json({ ok: false, error: "Profile lookup failed" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      results: qscRes,
      profile: profile ?? null,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
