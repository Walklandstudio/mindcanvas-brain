import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabase/server";
import { suggestFrameworkNames } from "@/app/_lib/ai";

export const runtime = "nodejs";

type Body = {
  orgId?: string;       // if present → persist; if absent → preview only
  orgName?: string;
  industry?: string;
  sector?: string;
  primaryGoal?: string;
  brandTone?: string;
  ownerId?: string | null; // optional, can be null
};

// helpers
const normalizeId = (s?: string) => (s || "").trim().replace(/^:/, "");
const isLikelyId = (s?: string) => {
  if (!s) return false;
  const x = s.trim();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const ulid = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
  const cuidish = /^[a-z0-9_-]{12,}$/i;
  return uuid.test(x) || ulid.test(x) || cuidish.test(x);
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const orgId = normalizeId(body.orgId);
    const hasOrg = isLikelyId(orgId);

    const industry = body.industry || "General";
    const sector = body.sector || "General";
    const primaryGoal = body.primaryGoal || "Improve team performance";
    const brandTone = body.brandTone || "confident, modern, human";

    // Use your existing AI helper
    const proposal = await suggestFrameworkNames({
      industry,
      sector,
      brandTone,
      primaryGoal,
    });

    // Build frequency_meta blob compatible with your table
    const frequency_meta = {
      // compatible keys for future code:
      frequencies: proposal.frequencies,                 // A..D → name
      profiles: proposal.profiles,                       // 8 profiles
      imagePrompts: proposal.imagePrompts,               // optional prompts
      // convenience per-frequency objects (also helpful for UI)
      A: { name: proposal.frequencies.A, color: "red",   image_prompt: proposal.imagePrompts.A,  image_url: null },
      B: { name: proposal.frequencies.B, color: "yellow",image_prompt: proposal.imagePrompts.B,  image_url: null },
      C: { name: proposal.frequencies.C, color: "green", image_prompt: proposal.imagePrompts.C,  image_url: null },
      D: { name: proposal.frequencies.D, color: "blue",  image_prompt: proposal.imagePrompts.D,  image_url: null },
    };

    const name = `${body.orgName || "Signature"} — Core Framework`;
    const payload = { name, version: "1", frequency_meta, owner_id: body.ownerId ?? null };

    // If no orgId, return preview only (no write)
    if (!hasOrg) {
      return NextResponse.json({ ok: true, preview: { org_id: null, ...payload } });
    }

    const supabase = supabaseAdmin();

    // Ensure org exists
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", orgId)
      .single();
    if (orgErr || !org) {
      return NextResponse.json(
        { error: "Organization not found for orgId", details: orgErr?.message },
        { status: 400 }
      );
    }

    // If the org already has a framework, return it instead of duplicating
    const { data: existing } = await supabase
      .from("frameworks")
      .select("id, org_id, name, version, created_at, owner_id, frequency_meta")
      .eq("org_id", orgId)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ ok: true, framework: existing[0], note: "existing" });
    }

    // Insert a new framework into your `frameworks` table
    const { data, error } = await supabase
      .from("frameworks")
      .insert({
        org_id: orgId,
        name: payload.name,
        version: payload.version,
        owner_id: payload.owner_id,
        frequency_meta: payload.frequency_meta,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, framework: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Auto framework failed" }, { status: 400 });
  }
}
