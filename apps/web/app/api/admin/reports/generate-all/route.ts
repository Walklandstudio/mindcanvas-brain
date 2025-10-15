export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceClient } from "../../../../_lib/supabase";
import { draftReportSections, buildProfileCopy } from "../../../../_lib/ai";

export async function POST(req: Request) {
  const sb = getServiceClient();

  const c = await cookies();
  const orgId = c.get("mc_org_id")?.value ?? null;
  if (!orgId) return NextResponse.json({ message: "no org" }, { status: 400 });

  const q = new URL(req.url).searchParams;
  const overwrite = (q.get("overwrite") || "false") === "true";

  // Fetch a framework row without ordering by updated_at
  let fw = null as any;
  {
    const { data, error } = await sb
      .from("org_frameworks")
      .select("id, frequency_meta")
      .eq("org_id", orgId)
      .limit(1);
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    fw = Array.isArray(data) ? data[0] : data ?? null;
    if (!fw) return NextResponse.json({ message: "framework not found" }, { status: 404 });
  }

  const frameworkId = fw.id as string;

  const legacy = (fw.frequency_meta as any) || {};
  const frequencyNames: Record<"A"|"B"|"C"|"D", string> = {
    A: legacy?.A?.name ?? "A",
    B: legacy?.B?.name ?? "B",
    C: legacy?.C?.name ?? "C",
    D: legacy?.D?.name ?? "D",
  };

  const { data: profiles, error: pErr } = await sb
    .from("org_profiles")
    .select("id,name,frequency,summary")
    .eq("org_id", orgId)
    .eq("framework_id", frameworkId)
    .order("ordinal", { ascending: true });
  if (pErr) return NextResponse.json({ message: pErr.message }, { status: 500 });

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

  const results: Array<{profileId: string; created: boolean; updated: boolean;}> = [];

  for (const prof of profiles ?? []) {
    const { data: existing } = await sb
      .from("org_profile_reports")
      .select("sections, approved")
      .eq("org_id", orgId)
      .eq("framework_id", frameworkId)
      .eq("profile_id", prof.id)
      .maybeSingle();

    const alreadyHasSections =
      existing && existing.sections && typeof existing.sections === "object" &&
      (existing.sections as any).strengths;

    if (alreadyHasSections && !overwrite) {
      results.push({ profileId: prof.id, created: false, updated: false });
      continue;
    }

    const ai = (await draftReportSections({
      brandTone,
      industry,
      sector,
      company,
      frequencyName: frequencyNames[prof.frequency as "A"|"B"|"C"|"D"] ?? String(prof.frequency),
      profileName: prof.name,
    })) as any;

    let summary = (ai?.summary as string | undefined)?.trim();
    if (!summary) {
      const blurb = await buildProfileCopy({
        brandTone,
        industry,
        sector,
        company,
        frequencyName: frequencyNames[prof.frequency as "A"|"B"|"C"|"D"] ?? String(prof.frequency),
        profileName: prof.name,
      });
      summary = (blurb.summary || "").trim();
    }

    const sections = {
      summary,
      strengths: String(ai?.strengths ?? ""),
      challenges: String(ai?.challenges ?? ""),
      roles: String(ai?.roles ?? ""),
      guidance: String(ai?.guidance ?? ""),
    };

    const { error: upErr } = await sb
      .from("org_profile_reports")
      .upsert(
        {
          org_id: orgId,
          framework_id: frameworkId,
          profile_id: prof.id,
          sections: sections as any,
          approved: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id,framework_id,profile_id" }
      );
    if (upErr) return NextResponse.json({ message: upErr.message }, { status: 500 });

    results.push({ profileId: prof.id, created: !existing, updated: !!existing });
  }

  return NextResponse.json({ ok: true, count: results.length, results }, { status: 200 });
}
