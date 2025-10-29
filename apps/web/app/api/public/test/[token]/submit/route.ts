// apps/web/app/api/public/test/[token]/submit/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type SubmitBody = {
  taker_id?: string | null;
  answers?: Record<string, any> | null;   // raw answers map (qid -> val)
  totals?: { A?: number; B?: number; C?: number; D?: number } | null;

  // snapshot/update fields
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  company?: string | null;
  role_title?: string | null;
};

function norm(s?: string | null) {
  if (typeof s !== "string") return null;
  const t = s.trim();
  return t.length ? t : null;
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const sb = createClient().schema("portal");

  try {
    const token = (params?.token || "").trim();
    if (!token) {
      return NextResponse.json({ ok: false, error: "missing token" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as SubmitBody;

    // 1) Resolve link (need org_id + test_id + token for taker/submission linkage)
    const { data: link, error: linkErr } = await sb
      .from("test_links")
      .select("id, org_id, test_id, token")
      .eq("token", token)
      .maybeSingle();

    if (linkErr) return NextResponse.json({ ok: false, error: linkErr.message }, { status: 500 });
    if (!link)   return NextResponse.json({ ok: false, error: "Invalid test link" }, { status: 404 });

    // 2) Find or create the taker (test_takers requires org_id, test_id, link_token)
    let takerId = (body.taker_id || "").toString().trim();

    type TakerRow = {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      company: string | null;
      role_title: string | null;
    };

    let taker: TakerRow | null = null;

    if (takerId) {
      const { data, error } = await sb
        .from("test_takers")
        .select("id, first_name, last_name, email, company, role_title")
        .eq("id", takerId)
        .eq("test_id", link.test_id) // safety: ensure belongs to this test
        .maybeSingle();
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      taker = data ?? null;
    }

    if (!taker) {
      const first_name = norm(body.first_name);
      const last_name  = norm(body.last_name);
      const email      = norm(body.email);
      const company    = norm(body.company);
      const role_title = norm(body.role_title);

      const { data: created, error: createErr } = await sb
        .from("test_takers")
        .insert([{
          org_id: link.org_id,     // required by your takers table
          test_id: link.test_id,   // required by your takers table
          link_token: link.token,  // required (NOT NULL) by your takers table
          link_id: link.id,        // if column exists, harmless otherwise (remove if not present)
          first_name, last_name, email, company, role_title,
          status: "in_progress",
        }])
        .select("id, first_name, last_name, email, company, role_title")
        .maybeSingle();

      if (createErr) return NextResponse.json({ ok: false, error: createErr.message }, { status: 500 });
      if (!created)  return NextResponse.json({ ok: false, error: "Failed to create taker" }, { status: 500 });

      taker = created;
      takerId = created.id;
    }

    // 3) Snapshot identity to store on submission row
    const snap = {
      first_name: taker.first_name ?? norm(body.first_name) ?? null,
      last_name:  taker.last_name  ?? norm(body.last_name)  ?? null,
      email:      taker.email      ?? norm(body.email)      ?? null,
      company:    taker.company    ?? norm(body.company)    ?? null,
      role_title: taker.role_title ?? norm(body.role_title) ?? null,
    };

    // 4) Insert submission into portal.test_submissions (schema below must match yours)
    //    Columns (per your DDL): id, taker_id, test_id, link_token, totals (jsonb NOT NULL),
    //    raw_answers (jsonb), created_at, company, role_title, first_name, last_name, email,
    //    answers_json (jsonb).
    const totals = body.totals ?? { A: 0, B: 0, C: 0, D: 0 };
    const rawAnswers = body.answers ?? {};

    const submissionRow = {
      taker_id: takerId,
      test_id: link.test_id,
      link_token: link.token,
      totals,                      // -> portal.test_submissions.totals (jsonb, NOT NULL)
      raw_answers: rawAnswers,     // -> optional, keep raw
      answers_json: rawAnswers,    // -> keep parity with old naming used in UI
      ...snap,
    };

    const { error: subErr } = await sb.from("test_submissions").insert([submissionRow]);
    if (subErr) {
      // if a unique exists and it’s a double-submit, allow it to proceed to results
      const isDup = /duplicate key|unique constraint/i.test(subErr.message || "");
      if (!isDup) return NextResponse.json({ ok: false, error: subErr.message }, { status: 500 });
    }

    // 5) Upsert into portal.test_results (unique taker_id) with the same totals
    const { error: resErr } = await sb
      .from("test_results")
      .upsert(
        { taker_id: takerId, totals },
        { onConflict: "taker_id" }
      );
    if (resErr) return NextResponse.json({ ok: false, error: resErr.message }, { status: 500 });

    // 6) Mark taker completed
    await sb.from("test_takers").update({ status: "completed" }).eq("id", takerId);

    // 7) Done
    return NextResponse.json({ ok: true, taker_id: takerId }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
