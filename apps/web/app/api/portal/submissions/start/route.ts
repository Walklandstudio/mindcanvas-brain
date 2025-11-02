import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabaseAdmin";

/**
 * NOTE:
 * Your portal.test_links does NOT include `expires_at`, and uses `use_count` (not `uses`).
 * This endpoint is legacy/optional. We’ll make it schema-safe and no-op on the old columns.
 */
export async function POST(req: Request) {
  try {
    const sb = supabaseAdmin(); // ensure this client is scoped to portal schema in your helper
    const { token } = await req.json().catch(() => ({}));
    if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

    // Look up link with columns that actually exist
    const { data: link, error: linkErr } = await sb
      .from("test_links")
      .select("id, org_id, test_id, token, max_uses, use_count, created_at")
      .eq("token", token)
      .maybeSingle();

    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });
    if (!link) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

    // Basic usage limit (no expires_at in your schema)
    if (
      typeof link.max_uses === "number" &&
      link.max_uses >= 0 &&
      typeof link.use_count === "number" &&
      link.use_count >= link.max_uses
    ) {
      return NextResponse.json({ error: "Link already used" }, { status: 409 });
    }

    // This endpoint previously inserted a submission. Your main flow inserts on /submit.
    // To keep compatibility without guessing table shape, we’ll just bump use_count safely.
    await sb.from("test_links").update({ use_count: (link.use_count ?? 0) + 1 }).eq("id", link.id);

    // Return a minimal success payload
    return NextResponse.json({ ok: true, link: { id: link.id, token: link.token } }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
