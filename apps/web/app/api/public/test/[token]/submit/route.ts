import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const token = params.token;
    if (!token) return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });

    const body = await req.json().catch(() => ({} as any));
    const takerId: string | undefined = body.taker_id || body.takerId || body.tid;
    if (!takerId) return NextResponse.json({ ok: false, error: "Missing taker_id" }, { status: 400 });

    const answers_json = body.answers ?? null;
    const frequency_totals = body.frequency_totals ?? body.totals ?? {}; // accept either field name
    const profile_totals = body.profile_totals ?? null;

    const sb = supa();

    // Resolve taker
    const { data: taker, error: takerErr } = await sb
      .from("test_takers")
      .select("id, test_id, link_token, first_name, last_name, email, company, role_title")
      .eq("id", takerId).eq("link_token", token).maybeSingle();

    if (takerErr || !taker) {
      return NextResponse.json({ ok: false, error: "Taker not found for this token" }, { status: 404 });
    }

    // Insert submission snapshot (write the correct column: totals)
    const submissionPayload = {
      taker_id: taker.id,
      test_id: taker.test_id,
      link_token: token,
      totals: frequency_totals ?? {},  // ✅ A/B/C/D
      answers_json,
      // optional: if you wish to keep profile_totals, uncomment when you add the column
      // profile_totals,
      first_name: taker.first_name ?? null,
      last_name: taker.last_name ?? null,
      email: taker.email ?? null,
      company: taker.company ?? null,
      role_title: taker.role_title ?? null,
    };
    const { error: subErr } = await sb.from("test_submissions").insert(submissionPayload);
    if (subErr) {
      return NextResponse.json({ ok: false, error: `Submission insert failed: ${subErr.message}` }, { status: 500 });
    }

    // Upsert denormalized results (preferred source for report)
    const { error: resErr } = await sb
      .from("test_results")
      .upsert({ taker_id: taker.id, totals: frequency_totals ?? {} }, { onConflict: "taker_id" });

    if (resErr) {
      // Non-fatal, report route falls back to submissions
      console.warn("test_results upsert failed", resErr.message);
    }

    // Mark taker completed
    await sb.from("test_takers").update({ status: "completed" })
      .eq("id", taker.id).eq("link_token", token);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
