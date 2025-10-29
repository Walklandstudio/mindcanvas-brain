// apps/web/app/api/public/test/[token]/taker/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type Body = {
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
    const body = (await req.json().catch(() => ({}))) as Body;

    const first_name = norm(body.first_name);
    const last_name  = norm(body.last_name);
    const email      = norm(body.email);
    const company    = norm(body.company);
    const role_title = norm(body.role_title);

    // Resolve token -> link
    const { data: link, error: linkErr } = await sb
      .from("test_links")
      .select("id, test_id, org_id, max_uses, use_count")
      .eq("token", params.token)
      .maybeSingle();
    if (linkErr) throw new Error(linkErr.message);
    if (!link)   return NextResponse.json({ ok: false, error: "Invalid or expired link" }, { status: 404 });

    // Optional usage cap
    if (typeof link.max_uses === "number" && typeof link.use_count === "number") {
      if (link.max_uses > 0 && link.use_count >= link.max_uses) {
        return NextResponse.json({ ok: false, error: "Link usage limit reached" }, { status: 403 });
      }
    }

    // Create taker
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
    if (takerErr) throw new Error(takerErr.message);
    if (!taker)   throw new Error("Failed to create test taker");

    // Best-effort increment
    if (typeof link.use_count === "number") {
      await sb.from("test_links").update({ use_count: link.use_count + 1 }).eq("id", link.id);
    }

    return NextResponse.json({ ok: true, taker_id: taker.id, test_id: link.test_id }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
