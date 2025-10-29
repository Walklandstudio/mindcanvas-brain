// apps/web/app/api/public/test/[token]/submit/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type SubmitBody = {
  taker_id?: string | null;
  answers?: Record<string, any> | null;  // raw client answers
  totals?: Record<string, any> | null;   // computed totals (freq/profiles)
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
    const body = (await req.json().catch(() => ({}))) as SubmitBody;

    if (!token) {
      return NextResponse.json({ ok: false, error: "missing token" }, { status: 400 });
    }

    // 1) Resolve link → test_id
    const { data: link, error: linkErr } = await sb
      .from("test_links")
      .select("test_id, token")
      .eq("token", token)
      .maybeSingle();
    if (linkErr) return NextResponse.json({ ok: false, error: linkErr.message }, { status: 500 });
    if (!link)   return NextResponse.json({ ok: false, error: "invalid link" }, { status: 404 });

    // 2) Grab org_id from tests (NOT from submissions)
    const { data: test, error: testErr } = await sb
      .from("tests")
      .select("id, org_id")
      .eq("id", link.test_id)
      .maybeSingle();
    if (testErr) return NextResponse.json({ ok: false, error: testErr.message }, { status: 500 });
    if (!test)   return NextResponse.json({ ok: false, error: "invalid test" }, { status: 404 });

    // 3) Find/create taker (test_takers requires org_id, test_id, link_token)
    let takerId = (body.taker_id ?? "").toString().trim();
    let taker:
      | { id: string; first_name: string | null; last_name: string | null; email: string | null; company: string | null; role_title: string | null }
      | null = null;

    if (takerId) {
      const { data, error } = await sb
        .from("test_takers")
        .select("id, first_name, last_name, email, company, role_title")
        .eq("id", takerId)
        .eq("test_id", test.id)
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
          org_id: test.org_id,     // ← required by your test_takers
          test_id: test.id,
          link_token: link.token,  // ← required by your test_takers
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

    // 4) Snapshot identity for submission rows
    const snap = {
      first_name: taker.first_name ?? norm(body.first_name) ?? null,
      last_name:  taker.last_name  ?? norm(body.last_name)  ?? null,
      email:      taker.email      ?? norm(body.email)      ?? null,
      company:    taker.company    ?? norm(body.company)    ?? null,
      role_title: taker.role_title ?? norm(body.role_title) ?? null,
    };

    // 5) Insert into portal.test_submissions (YOUR exact columns)
    const submissionRow = {
      taker_id: takerId,
      test_id: test.id,
      link_token: link.token,
      totals: body.totals ?? {},          // ← jsonb NOT NULL (defaults to {})
      raw_answers: body.answers ?? null,  // ← optional raw payload
      answers_json: body.answers ?? {},   // ← keep for convenience (you already have this column)
      ...snap,
    };

    const { data: sub, error: subErr } = await sb
      .from("test_submissions")
      .insert([submissionRow])
      .select("id")
      .maybeSingle();

    if (subErr) {
      const isDup = /duplicate key|unique constraint/i.test(subErr.message || "");
      if (!isDup) return NextResponse.json({ ok: false, error: subErr.message }, { status: 500 });
    }

    // 6) Upsert into portal.test_results (taker_id UNIQUE)
    if (body.totals && typeof body.totals === "object") {
      const { error: upErr } = await sb
        .from("test_results")
        .upsert([{ taker_id: takerId, totals: body.totals }], { onConflict: "taker_id" });
      if (upErr) {
        // Non-fatal; continue
        console.warn("test_results upsert warning:", upErr.message);
      }
    }

    // 7) Mark taker completed
    await sb.from("test_takers").update({ status: "completed" }).eq("id", takerId);

    return NextResponse.json({ ok: true, taker_id: takerId, submission_id: sub?.id ?? null }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
