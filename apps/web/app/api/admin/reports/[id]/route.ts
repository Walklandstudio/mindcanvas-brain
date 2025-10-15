export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceClient } from "../../../../_lib/supabase";
import { draftReportSections } from "../../../../_lib/ai";

/** Canonical sections shape (all keys optional but ALWAYS present on the object) */
type ReportSections = {
  summary?: string;
  strengths?: string;
  challenges?: string;
  roles?: string;
  guidance?: string;
};

/** Loose DB row (jsonb + legacy columns) */
type RowReport = {
  sections?: any;
  strengths?: any;
  challenges?: any;
  roles?: any;
  guidance?: any;
  approved?: boolean;
};

/** Return ALL keys so TS knows .summary exists on the type */
function normalizeSections(x: any): ReportSections {
  const s = (x && typeof x === "object") ? x : {};
  const out: ReportSections = {
    summary: typeof s.summary === "string" ? s.summary : undefined,
    strengths: typeof s.strengths === "string" ? s.strengths : undefined,
    challenges: typeof s.challenges === "string" ? s.challenges : undefined,
    roles: typeof s.roles === "string" ? s.roles : undefined,
    guidance: typeof s.guidance === "string" ? s.guidance : undefined,
  };
  return out;
}

/** Merge jsonb + legacy; jsonb wins; return ALL keys present */
function coalesceReportRow(row: RowReport | null | undefined): { sections: ReportSections; approved: boolean } {
  const jsonb = normalizeSections(row?.sections);
  const legacy = normalizeSections({
    strengths: row?.strengths,
    challenges: row?.challenges,
    roles: row?.roles,
    guidance: row?.guidance,
  });
  const merged: ReportSections = {
    summary: jsonb.summary, // legacy had no summary
    strengths: jsonb.strengths ?? legacy.strengths,
    challenges: jsonb.challenges ?? legacy.challenges,
    roles: jsonb.roles ?? legacy.roles,
    guidance: jsonb.guidance ?? legacy.guidance,
  };
  // Ensure all keys exist on the object literal for TS
  return {
    sections: {
      summary: merged.summary,
      strengths: merged.strengths,
      challenges: merged.challenges,
      roles: merged.roles,
      guidance: merged.guidance,
    },
    approved: !!row?.approved,
  };
}

async function getOrgId(): Promise<string | null> {
  const c = await cookies();
  return c.get("mc_org_id")?.value ?? null;
}

async function loadContext(
  sb: ReturnType<typeof getServiceClient>,
  orgId: string,
  profileId: string
) {
  // Profile
  const { data: prof, error: profErr } = await sb
    .from("org_profiles")
    .select("id, name, frequency, framework_id, image_url")
    .eq("id", profileId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (profErr || !prof) throw new Error(profErr?.message || "profile not found");

  // Framework (labels: meta.frequencies OR legacy frequency_meta)
  const { data: fw } = await sb
    .from("org_frameworks")
    .select("id, meta, frequency_meta")
    .eq("id", prof.framework_id)
    .eq("org_id", orgId)
    .maybeSingle();

  const meta = (fw?.meta as any) || {};
  const legacy = (fw?.frequency_meta as any) || {};
  const frequencies =
    (meta?.frequencies as Record<"A" | "B" | "C" | "D", string> | undefined) ??
    (["A", "B", "C", "D"].reduce((acc: any, k) => {
      acc[k] = legacy?.[k]?.name ?? k;
      return acc;
    }, {} as Record<"A" | "B" | "C" | "D", string>));

  // Onboarding context
  const { data: ob } = await sb
    .from("org_onboarding")
    .select("data")
    .eq("org_id", orgId)
    .maybeSingle();
  const od = (ob?.data as any) ?? {};
  const brandTone = od?.branding?.tone ?? od?.branding?.brandTone ?? "confident, modern, human";
  const industry = od?.company?.industry ?? od?.goals?.industry ?? "General";
  const sector   = od?.company?.sector   ?? od?.goals?.sector   ?? "General";
  const company  = od?.account?.companyName ?? od?.company?.name ?? "Company";

  return {
    profile: {
      id: prof.id as string,
      name: prof.name as string,
      frequency: prof.frequency as "A" | "B" | "C" | "D",
      framework_id: prof.framework_id as string,
    },
    frequencyNames: frequencies as Record<"A" | "B" | "C" | "D", string>,
    onboarding: { brandTone, industry, sector, company },
  };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ message: "no org" }, { status: 400 });

  const sb = getServiceClient();
  const ctx = await loadContext(sb, orgId, params.id);

  const { data: row } = await sb
    .from("org_profile_reports")
    .select("sections, strengths, challenges, roles, guidance, approved")
    .eq("org_id", orgId)
    .eq("framework_id", ctx.profile.framework_id)
    .eq("profile_id", ctx.profile.id)
    .maybeSingle();

  const { sections, approved } = coalesceReportRow(row as RowReport);

  return NextResponse.json({
    profile: { id: ctx.profile.id, name: ctx.profile.name, frequency: ctx.profile.frequency },
    frequencyName: ctx.frequencyNames[ctx.profile.frequency],
    sections, // has .summary in the type
    approved,
  });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ message: "no org" }, { status: 400 });

  const sb = getServiceClient();
  const ctx = await loadContext(sb, orgId, params.id);

  type Body = { op: "draft" | "save" | "approve"; sections?: ReportSections };
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ message: "invalid json" }, { status: 400 });
  }

  // Load current
  const { data: current } = await sb
    .from("org_profile_reports")
    .select("sections, strengths, challenges, roles, guidance, approved")
    .eq("org_id", orgId)
    .eq("framework_id", ctx.profile.framework_id)
    .eq("profile_id", ctx.profile.id)
    .maybeSingle();

  let { sections, approved } = coalesceReportRow(current as RowReport);
  // Make TS absolutely certain about the shape:
  sections = {
    summary: sections.summary,
    strengths: sections.strengths,
    challenges: sections.challenges,
    roles: sections.roles,
    guidance: sections.guidance,
  };

  if (body.op === "draft") {
    const ai = await draftReportSections({
      brandTone: ctx.onboarding.brandTone,
      industry: ctx.onboarding.industry,
      sector: ctx.onboarding.sector,
      company: ctx.onboarding.company,
      frequencyName: ctx.frequencyNames[ctx.profile.frequency],
      profileName: ctx.profile.name,
    });

    sections = {
      summary: ai?.summary ?? sections.summary,
      strengths: ai?.strengths ?? sections.strengths,
      challenges: ai?.challenges ?? sections.challenges,
      roles: ai?.roles ?? sections.roles,
      guidance: ai?.guidance ?? sections.guidance,
    };
    approved = false;
  } else if (body.op === "save") {
    if (body.sections && typeof body.sections === "object") {
      const add = normalizeSections(body.sections);
      sections = {
        summary: add.summary ?? sections.summary,
        strengths: add.strengths ?? sections.strengths,
        challenges: add.challenges ?? sections.challenges,
        roles: add.roles ?? sections.roles,
        guidance: add.guidance ?? sections.guidance,
      };
    }
    approved = false;
  } else if (body.op === "approve") {
    if (body.sections && typeof body.sections === "object") {
      const add = normalizeSections(body.sections);
      sections = {
        summary: add.summary ?? sections.summary,
        strengths: add.strengths ?? sections.strengths,
        challenges: add.challenges ?? sections.challenges,
        roles: add.roles ?? sections.roles,
        guidance: add.guidance ?? sections.guidance,
      };
    }
    approved = true;
  } else {
    return NextResponse.json({ message: "invalid op" }, { status: 400 });
  }

  // Upsert by (org_id, framework_id, profile_id)
  const { error: upErr } = await sb
    .from("org_profile_reports")
    .upsert(
      {
        org_id: orgId,
        framework_id: ctx.profile.framework_id,
        profile_id: ctx.profile.id,
        sections: sections as any, // write JSONB
        approved,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id,framework_id,profile_id" }
    );

  if (upErr) return NextResponse.json({ message: upErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, sections, approved }, { status: 200 });
}
