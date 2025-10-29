// apps/web/app/api/public/test/[token]/submit/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type SubmitBody = {
  taker_id: string;
  answers?: unknown;           // whatever your UI posts
  totals?: Record<string, any>;// your computed totals payload
};

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const sb = createClient().schema("portal");

  try {
    const body = (await req.json().catch(() => ({}))) as Partial<SubmitBody>;
    const taker_id = body.taker_id;

    if (!taker_id) {
      return NextResponse.json({ ok: false, error: "Missing taker_id" }, { status: 400 });
    }

    // Resolve link
    const { data: link, error: linkErr } = await sb
      .from("test_links")
      .select("test_id, org_id")
      .eq("token", params.token)
      .maybeSingle();

    if (linkErr) return NextResponse.json({ ok: false, error: linkErr.message }, { status: 500 });
    if (!link)   return NextResponse.json({ ok: false, error: "Invalid test link" }, { status: 404 });

    // Load taker identity (copy to submission)
    const { data: taker, error: takerErr } = await sb
      .from("test_takers")
      .select("id, first_name, last_name, email, company, role_title")
      .eq("id", taker_id)
      .maybeSingle();

    if (takerErr) {
      return NextResponse.json({ ok: false, error: takerErr.message }, { status: 500 });
    }
    if (!taker) {
      return NextResponse.json({ ok: false, error: "Taker not found" }, { status: 404 });
    }

    // Insert submission (answers/totals shape matches your current pipeline)
    const { error: subErr } = await sb
      .from("test_submissions")
      .insert([{
        org_id: link.org_id,
        test_id: link.test_id,
        taker_id: taker.id,
        answers_json: body.answers ?? null,  // if your table uses a different column, adjust here
        totals_json:  body.totals  ?? null,  // if your table uses a different column, adjust here
        status: "completed",
        // denormalized identity:
        first_name: taker.first_name ?? null,
        last_name:  taker.last_name  ?? null,
        email:      taker.email      ?? null,
        company:    taker.company    ?? null,
        role_title: taker.role_title ?? null,
      }]);

    if (subErr) {
      // If duplicate (unique constraint), just mark taker completed and return ok=true
      const already = /duplicate key|unique constraint/i.test(subErr.message);
      if (!already) {
        return NextResponse.json({ ok: false, error: subErr.message }, { status: 500 });
      }
    }

    // Mark taker status
    await sb.from("test_takers").update({ status: "completed" }).eq("id", taker.id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
