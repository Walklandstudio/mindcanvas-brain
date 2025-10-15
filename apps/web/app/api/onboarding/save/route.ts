import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabase/server";

export const runtime = "nodejs";

type Body = {
  orgId?: string;      // now optional & tolerant
  step?: string;       // e.g., "goals" (ignored by DB, but ok to pass)
  data?: unknown;      // free-form step payload (not stored here)
  name?: string;       // optional organization name update
  logoUrl?: string;    // optional organization logo update
};

// very tolerant id check: uuid, ulid, cuid-ish, or any >= 12 chars
function isLikelyId(s: string) {
  if (!s) return false;
  const str = String(s).trim().replace(/^:/, "");
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const ulid = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
  const cuidish = /^[a-z0-9_-]{12,}$/i;
  return uuid.test(str) || ulid.test(str) || cuidish.test(str);
}

function normalizeId(s?: string) {
  if (!s) return "";
  return s.trim().replace(/^:/, "");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const orgId = normalizeId(body.orgId);
    const patch: { name?: string; logo_url?: string | null } = {};
    if (body.name) patch.name = body.name;
    if (body.logoUrl) patch.logo_url = body.logoUrl;

    // If no valid orgId OR nothing to update, we don’t block the flow.
    // We just acknowledge the save so the UI can continue to next step.
    if (!isLikelyId(orgId) || Object.keys(patch).length === 0) {
      return NextResponse.json({
        ok: true,
        message: "Saved (no org update performed)",
      });
    }

    const supabase = supabaseAdmin();

    // ensure org exists (don’t hard error if not found; return soft success)
    const { data: existing, error: orgErr } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", orgId)
      .maybeSingle();

    if (orgErr) {
      // soft-pass so the user can proceed; include details for debugging
      return NextResponse.json({ ok: true, note: "Org lookup failed", details: orgErr.message });
    }

    if (!existing) {
      // soft-pass if org isn’t in DB yet
      return NextResponse.json({ ok: true, note: "Org not found — skipping update" });
    }

    const { data, error } = await supabase
      .from("organizations")
      .update(patch)
      .eq("id", orgId)
      .select()
      .single();

    if (error) {
      // soft-pass but include the error
      return NextResponse.json({ ok: true, note: "Update skipped", details: error.message });
    }

    return NextResponse.json({ ok: true, organization: data });
  } catch (e: any) {
    // soft response — don’t block navigation
    return NextResponse.json({ ok: true, note: "Payload issue", details: e?.message ?? "" });
  }
}
