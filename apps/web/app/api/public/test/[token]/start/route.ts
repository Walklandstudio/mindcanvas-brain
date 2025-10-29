// apps/web/app/api/public/test/[token]/start/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type StartBody = {
  first_name: string;
  last_name: string;
  email: string;
  company?: string | null;
  role_title?: string | null;
};

function sanitize(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const trimmed = s.trim();
  return trimmed.length ? trimmed : null;
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<StartBody>;
    const first_name = sanitize(body.first_name);
    const last_name  = sanitize(body.last_name);
    const email      = sanitize(body.email);
    const company    = sanitize(body.company ?? null);
    const role_title = sanitize(body.role_title ?? null);

    if (!first_name || !last_name || !email) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields (first_name, last_name, email)" },
        { status: 400 }
      );
    }

    const sb = createClient().schema("portal");

    // Resolve token → link (test_id, org_id)
    const { data: link, error: linkErr } = await sb
      .from("test_links")
      .select("id, test_id, org_id, max_uses, use_count")
      .eq("token", params.token)
      .maybeSingle();

    if (linkErr) return NextResponse.json({ ok: false, error: linkErr.message }, { status: 500 });
    if (!link)   return NextResponse.json({ ok: false, error: "Invalid or expired link" }, { status: 404 });

    if (typeof link.max_uses === "number" && typeof link.use_count === "number") {
      if (link.max_uses > 0 && link.use_count >= link.max_uses) {
        return NextResponse.json({ ok: false, error: "Link usage limit reached" }, { status: 403 });
      }
    }

    // Insert taker
    const { data: taker, error: takerErr } = await sb
      .from("test_takers")
      .insert([{
        org_id: link.org_id,
        test_id: link.test_id,
        first_name, last_name, email, company, role_title,
        status: "in_progress",
      }])
      .select("id")
      .maybeSingle();

    if (takerErr) {
      return NextResponse.json({ ok: false, error: takerErr.message }, { status: 500 });
    }
    if (!taker) {
      return NextResponse.json({ ok: false, error: "Failed to create test taker" }, { status: 500 });
    }

    // Increment link use_count (best-effort, non-blocking)
    if (typeof link.use_count === "number") {
      await sb
        .from("test_links")
        .update({ use_count: link.use_count + 1 })
        .eq("id", link.id);
    }

    return NextResponse.json({ ok: true, taker_id: taker.id, test_id: link.test_id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
