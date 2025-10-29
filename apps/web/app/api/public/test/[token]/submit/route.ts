// apps/web/app/api/public/test/[token]/submit/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseAdmin"; // must return a service-role client
export const dynamic = "force-dynamic";

type SubmitBody = {
  taker_id?: string | null;

  // answers can arrive as a map (qid -> value) or an array of {question_id, value}
  answers?: Record<string, any> | Array<{ question_id: string; value: any }>;
  totals?: Record<string, any> | null;

  // snapshot-able identity (optional on submit if taker already created)
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

    // 1) Resolve link (gives us org_id, test_id, link.id, link.token)
    const { data: link, error: linkErr } = await sb
      .from("test_links")
      .select("id, org_id, test_id, token")
      .eq("token", token)
      .maybeSingle();

    if (linkErr) return NextResponse.json({ ok: false, error: linkErr.message }, { status: 500 });
    if (!link)   return NextResponse.json({ ok: false, error: "Invalid test link" }, { status: 404 });

    // 2) Ensure we have a taker (either provided or create)
    let takerId = (body.taker_id || "").toString().trim();

    // helpful normalized fields (used for snapshot and create-if-needed)
    const first_name = norm(body.first_name);
    const last_name  = norm(body.last_name);
    const email      = norm(body.email);
    const company    = norm(body.company);
    const role_title = norm(body.role_title);

    // Try load the taker by id if provided
    let taker:
      | {
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          company: string | null;
          role_title: string | null;
        }
      | null = null;

    if (takerId) {
      const { data, error } = await sb
        .from("test_takers")
        .select("id, first_name, last_name, email, company, role_title, test_id")
        .eq("id", takerId)
        .maybeSingle();
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      if (data && data.test_id === link.test_id) {
        taker = data;
      } else {
        // If the provided taker_id doesn't belong to this test, ignore it and create a new one
        takerId = "";
      }
    }

    // If still no taker: try to re-use by email for this link/test to avoid dup rows
    if (!taker && email) {
      const { data: existing, error: exErr } = await sb
        .from("test_takers")
        .select("id, first_name, last_name, email, company, role_title")
        .eq("test_id", link.test_id)
        .eq("link_token", link.token)
        .eq("email", email)
        .limit(1)
        .maybeSingle();
      if (exErr) return NextResponse.json({ ok: false, error: exErr.message }, { status: 500 });
      if (existing) {
        taker = existing;
        takerId = existing.id;
      }
    }

    // Create taker if still absent
    if (!taker) {
      const { data: created, error: createErr } = await sb
        .from("test_takers")
        .insert([
          {
            org_id: link.org_id,
            test_id: link.test_id,
            link_token: link.token, // MUST satisfy NOT NULL constraint
            link_id: link.id ?? null, // if column exists, it's harmless if ignored by DB
            first_name,
            last_name,
            email,
            company,
            role_title,
            status: "in_progress",
          },
        ])
        .select("id, first_name, last_name, email, company, role_title")
        .single();

      if (createErr) {
        return NextResponse.json({ ok: false, error: createErr.message }, { status: 500 });
      }
      taker = created;
      takerId = created.id;
    }

    // 3) Prepare submission payload
    // Accept both an answers map and an answers array; we just store raw JSON as provided.
    const answers_json =
      Array.isArray(body.answers) || typeof body.answers === "object" ? body.answers : null;
    const totals_json = body.totals ?? null;

    // Snapshot identity for submission (prefer stored taker values, fallback to provided)
    const snap = {
      first_name: taker.first_name ?? first_name,
      last_name:  taker.last_name  ?? last_name,
      email:      taker.email      ?? email,
      company:    taker.company    ?? company,
      role_title: taker.role_title ?? role_title,
    };

    const submissionRow = {
      org_id: link.org_id,
      test_id: link.test_id,
      taker_id: takerId,
      link_token: link.token, // keep lineage for exports/joins
      answers_json,
      totals_json,
      status: "completed",
      ...snap,
    };

    // 4) Insert submission (ignore dup if a unique constraint exists)
    const { error: subErr } = await sb.from("test_submissions").insert([submissionRow]);
    if (subErr) {
      const isDup =
        /duplicate key|unique constraint|already exists|violates unique/i.test(subErr.message || "");
      if (!isDup) {
        return NextResponse.json({ ok: false, error: subErr.message }, { status: 500 });
      }
      // if duplicate, we still proceed to mark taker completed and return success
    }

    // 5) Mark taker completed
    await sb.from("test_takers").update({ status: "completed" }).eq("id", takerId);

    return NextResponse.json({ ok: true, taker_id: takerId }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
