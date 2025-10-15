import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabase/server";
import { suggestFrameworkNames } from "@/app/_lib/ai";

export const runtime = "nodejs";

type Body = {
  orgId: string;
  orgName?: string;

  // optional onboarding context for naming
  industry?: string;
  sector?: string;
  brandTone?: string;
  primaryGoal?: string;
};

// Minimal inline validation (no zod)
function parse(body: unknown): Body {
  if (!body || typeof body !== "object") throw new Error("Missing body");
  const b = body as Record<string, unknown>;
  const orgId = String(b.orgId || "");
  if (!/^[0-9a-fA-F-]{36}$/.test(orgId)) throw new Error("Invalid orgId");

  return {
    orgId,
    orgName: b.orgName ? String(b.orgName) : undefined,
    industry: b.industry ? String(b.industry) : undefined,
    sector: b.sector ? String(b.sector) : undefined,
    brandTone: b.brandTone ? String(b.brandTone) : undefined,
    primaryGoal: b.primaryGoal ? String(b.primaryGoal) : undefined,
  };
}

function slugify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function POST(req: Request) {
  try {
    const payload = parse(await req.json());
    const supabase = supabaseAdmin();

    // 1) Ensure org exists (prevents FK errors)
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", payload.orgId)
      .single();

    if (orgErr || !org) {
      return NextResponse.json(
        { error: "Organization not found for orgId", details: orgErr?.message },
        { status: 400 }
      );
    }

    // 2) Ask your AI helper to suggest frequency/profile names (with fallbacks inside)
    const branding = await suggestFrameworkNames({
      industry: payload.industry || "General",
      sector: payload.sector || "General",
      brandTone: payload.brandTone || "confident, modern, human",
      primaryGoal: payload.primaryGoal || "Improve team performance",
    });

    const baseName = `${payload.orgName || org.name} — Core Framework`;
    const frameworkName = baseName.trim();
    const slug = slugify(frameworkName) || "core-framework";

    // Build meta to store the names/prompts you generated
    const meta = {
      frequencies: branding.frequencies,
      profiles: branding.profiles,
      imagePrompts: branding.imagePrompts,
      source: "ai.suggestFrameworkNames",
    };

    // 3) Insert framework (typed; no "never" types)
    const { data, error } = await supabase
      .from("org_frameworks")
      .insert({
        org_id: payload.orgId,
        name: frameworkName,
        slug,
        meta,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, framework: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 400 });
  }
}
