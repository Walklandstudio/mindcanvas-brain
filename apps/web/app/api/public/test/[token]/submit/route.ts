// apps/web/app/api/public/test/[token]/submit/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type SubmitBody = {
  taker_id: string;
  answers?: Record<string, any>;  // qid -> selected index/value
  totals?: Record<string, any>;   // optional: if client computed totals
};

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

    // 2) Load taker (for denormalized identity on submission row)
    const { data: taker, error: takerErr } = await sb
      .from("test_takers")
      .select("id, first_name, last_name, email, company, role_title")
      .eq("id", taker_id)
      .maybeSingle();

    if (takerErr) return NextResponse.json({ ok: false, error: takerErr.message }, { status: 500 });
    if (!taker)   return NextResponse.json({ ok: false, error: "Taker not found" }, { status: 404 });

    // 3) Insert submission
    // NOTE: If your table uses different JSON column names, change the two marked lines below.
    const submission = {
      org_id: link.org_id,
      test_id: link.test_id,
      taker_id: taker.id,
      // ↓ adjust these column names if your schema differs
      answers_json: body.answers ?? null,
      totals_json:  body.totals  ?? null,
      status: "completed",
      // denormalized identity snapshot:
      first_name: taker.first_name ?? null,
      last_name:  taker.last_name  ?? null,
      email:      taker.email      ?? null,
      company:    taker.company    ?? null,
      role_title: taker.role_title ?? null,
    };

    const { error: subErr } = await sb.from("test_submissions").insert([submission]);

    if (subErr) {
      // If duplicate (unique key), mark taker completed and continue (idempotency)
      const isDup = /duplicate key|unique constraint/i.test(subErr.message || "");
      if (!isDup) {
        return NextResponse.json({ ok: false, error: subErr.message }, { status: 500 });
      }
    }

    // 4) Mark taker completed (idempotent)
    await sb.from("test_takers").update({ status: "completed" }).eq("id", taker.id);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
