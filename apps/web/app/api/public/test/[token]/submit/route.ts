// apps/web/app/api/public/test/[token]/submit/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// This route is server-only. Use the service role for cross-table writes.
function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

type TotalsABCD = { A?: number; B?: number; C?: number; D?: number } | Record<string, number>;
type Answers = unknown;

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const token = params.token;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({} as any));
    const takerId: string | undefined = body.taker_id || body.takerId || body.tid;
    if (!takerId) {
      return NextResponse.json({ ok: false, error: "Missing taker_id" }, { status: 400 });
    }

    // Expect totals to already be the A/B/C/D object your report math needs.
    const totals: TotalsABCD = body.totals ?? {};
    const answers: Answers = body.answers ?? null;

    const sb = supa();

    // 1) Resolve taker & test under this token (avoid trusting client test_id)
    const { data: taker, error: takerErr } = await sb
      .from("test_takers")
      .select("id, test_id, link_token, first_name, last_name, email, company, role_title")
      .eq("id", takerId)
      .eq("link_token", token)
      .maybeSingle();

    if (takerErr || !taker) {
      return NextResponse.json({ ok: false, error: "Taker not found for this token" }, { status: 404 });
    }

    // 2) Insert submission snapshot (NOTE: totals -> correct column)
    const submissionPayload = {
      taker_id: taker.id,
      test_id: taker.test_id,
      link_token: token,
      totals: totals ?? {},                // ✅ correct column
      answers_json: answers ?? null,       // keep answers snapshot if you use it
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

    // 3) Upsert denormalized results (preferred source for report API)
    const { error: resErr } = await sb
      .from("test_results")
      .upsert({ taker_id: taker.id, totals: totals ?? {} }, { onConflict: "taker_id" });
    if (resErr) {
      // Non-fatal: keep going, report page will still fall back to submissions
      // but we include a warning in the response.
      console.warn("test_results upsert failed", resErr.message);
    }

    // 4) Mark taker completed
    await sb
      .from("test_takers")
      .update({ status: "completed" })
      .eq("id", taker.id)
      .eq("link_token", token);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
