// apps/web/app/api/public/test/[token]/submit/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type SubmitBody = {
  taker_id: string;
  answers?: Record<string, any>;
  totals?: Record<string, any>;
  // Redundant identity (used to patch taker if missing)
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
    const body = (await req.json().catch(() => ({}))) as Partial<SubmitBody>;
    const taker_id = String(body?.taker_id || "").trim();
    if (!taker_id) {
      return NextResponse.json({ ok: false, error: "Missing taker_id" }, { status: 400 });
    }

    // 1) Resolve token → org/test
    const { data: link, error: linkErr } = await sb
      .from("test_links")
      .select("test_id, org_id")
      .eq("token", params.token)
      .maybeSingle();
    if (linkErr) return NextResponse.json({ ok: false, error: linkErr.message }, { status: 500 });
    if (!link)   return NextResponse.json({ ok: false, error: "Invalid test link" }, { status: 404 });

    // 2) Load taker
    const { data: taker, error: takerErr } = await sb
      .from("test_takers")
      .select("id, first_name, last_name, email, company, role_title")
      .eq("id", taker_id)
      .maybeSingle();
    if (takerErr) return NextResponse.json({ ok: false, error: takerErr.message }, { status: 500 });
    if (!taker)   return NextResponse.json({ ok: false, error: "Taker not found" }, { status: 404 });

    // 3) Patch taker identity if any field is missing (idempotent)
    const patch = {
      first_name: taker.first_name ?? norm(body.first_name ?? null),
      last_name:  taker.last_name  ?? norm(body.last_name  ?? null),
      email:      taker.email      ?? norm(body.email      ?? null),
      company:    taker.company    ?? norm(body.company    ?? null),
      role_title: taker.role_title ?? norm(body.role_title ?? null),
    };
    const needsPatch =
      !taker.first_name || !taker.last_name || !taker.email || !taker.company || !taker.role_title;

    if (needsPatch) {
      await sb.from("test_takers").update(patch).eq("id", taker.id);
    }

    // 4) Insert submission (denormalize identity at time of submit)
    const snap = {
      first_name: patch.first_name ?? taker.first_name ?? null,
      last_name:  patch.last_name  ?? taker.last_name  ?? null,
      email:      patch.email      ?? taker.email      ?? null,
      company:    patch.company    ?? taker.company    ?? null,
      role_title: patch.role_title ?? taker.role_title ?? null,
    };

    const submissionRow = {
      org_id: link.org_id,
      test_id: link.test_id,
      taker_id: taker.id,
      // adjust these column names if your schema differs:
      answers_json: body.answers ?? null,
      totals_json:  body.totals  ?? null,
      status: "completed",
      ...snap,
    };

    const { error: subErr } = await sb.from("test_submissions").insert([submissionRow]);
    if (subErr) {
      const isDup = /duplicate key|unique constraint/i.test(subErr.message || "");
      if (!isDup) {
        return NextResponse.json({ ok: false, error: subErr.message }, { status: 500 });
      }
    }

    // 5) Mark taker completed
    await sb.from("test_takers").update({ status: "completed" }).eq("id", taker.id);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
