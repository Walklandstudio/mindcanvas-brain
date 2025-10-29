import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type SubmitBody = {
  taker_id?: string | null;
  answers?: Record<string, any>;
  totals?: Record<string, any>;
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
    const body = (await req.json().catch(() => ({}))) as SubmitBody;

    // Resolve token → link (need org/test + link token)
    const { data: link, error: linkErr } = await sb
      .from("test_links")
      .select("id, org_id, test_id, token")
      .eq("token", params.token)
      .maybeSingle();
    if (linkErr) return NextResponse.json({ ok: false, error: linkErr.message }, { status: 500 });
    if (!link)   return NextResponse.json({ ok: false, error: "Invalid test link" }, { status: 404 });

    // Find or create taker (must include link_token on create)
    let takerId = body.taker_id?.toString().trim() || "";

    let taker:
      | { id: string; first_name: string | null; last_name: string | null; email: string | null; company: string | null; role_title: string | null }
      | null = null;

    if (takerId) {
      const { data, error } = await sb
        .from("test_takers")
        .select("id, first_name, last_name, email, company, role_title")
        .eq("id", takerId)
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
          org_id: link.org_id,
          test_id: link.test_id,
          link_token: link.token, // ← critical
          link_id: link.id,       // ← if column exists
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

    // Snapshot identity for the submission
    const snap = {
      first_name: taker.first_name ?? norm(body.first_name) ?? null,
      last_name:  taker.last_name  ?? norm(body.last_name)  ?? null,
      email:      taker.email      ?? norm(body.email)      ?? null,
      company:    taker.company    ?? norm(body.company)    ?? null,
      role_title: taker.role_title ?? norm(body.role_title) ?? null,
    };

    // Insert submission (adjust JSON columns if your table differs)
    const submission = {
      org_id: link.org_id,
      test_id: link.test_id,
      taker_id: takerId,
      answers_json: body.answers ?? null,
      totals_json:  body.totals  ?? null,
      status: "completed",
      ...snap,
    };

    const { error: subErr } = await sb.from("test_submissions").insert([submission]);
    if (subErr) {
      const isDup = /duplicate key|unique constraint/i.test(subErr.message || "");
      if (!isDup) return NextResponse.json({ ok: false, error: subErr.message }, { status: 500 });
    }

    await sb.from("test_takers").update({ status: "completed" }).eq("id", takerId);

    return NextResponse.json({ ok: true, taker_id: takerId }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
