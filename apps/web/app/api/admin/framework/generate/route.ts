import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabase/server";
import { suggestFrameworkNames } from "@/app/_lib/ai";

export const runtime = "nodejs";

type Body = {
  orgId?: string;
  orgName?: string;
  industry?: string;
  sector?: string;
  brandTone?: string;
  primaryGoal?: string;
  dryRun?: boolean; // if true OR if orgId missing ⇒ preview only
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function normalizeId(s?: string) {
  return (s || "").trim().replace(/^:/, "");
}
function isLikelyId(s?: string) {
  if (!s) return false;
  const x = s.trim();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const ulid = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
  const cuidish = /^[a-z0-9_-]{12,}$/i;
  return uuid.test(x) || ulid.test(x) || cuidish.test(x);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const orgIdRaw = normalizeId(body.orgId);
    const hasOrg = isLikelyId(orgIdRaw);
    const dryRun = body.dryRun || !hasOrg;

    // 1) Build the branded names via AI (your existing helper has fallbacks)
    const branding = await suggestFrameworkNames({
      industry: body.industry || "General",
      sector: body.sector || "General",
      primaryGoal: body.primaryGoal || "Improve team performance",
      brandTone: body.brandTone || "confident, modern, human",
    });

    const frameworkName = `${body.orgName || "Signature"} — Core Framework`.trim();
    const slug = slugify(frameworkName) || "core-framework";

    if (dryRun) {
      // 2A) Preview only — don't touch DB
      return NextResponse.json({
        ok: true,
        preview: {
          frequencies: branding.frequencies,
          profiles: branding.profiles,
          imagePrompts: branding.imagePrompts,
          name: frameworkName,
          slug,
        },
        note: hasOrg ? "dryRun requested" : "no orgId detected, returning preview",
      });
    }

    // 2B) Save to DB (org must exist for FK)
    const supabase = supabaseAdmin();

    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", orgIdRaw)
      .single();

    if (orgErr || !org) {
      return NextResponse.json(
        { error: "Organization not found for orgId", details: orgErr?.message },
        { status: 400 }
      );
    }

    const meta = {
      frequencies: branding.frequencies,
      profiles: branding.profiles,
      imagePrompts: branding.imagePrompts,
      source: "ai.suggestFrameworkNames",
    };

    const { data, error } = await supabase
      .from("org_frameworks")
      .insert({
        org_id: orgIdRaw,
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
