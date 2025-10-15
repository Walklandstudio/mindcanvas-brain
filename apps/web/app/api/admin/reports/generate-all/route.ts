export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceClient } from "../../../../_lib/supabase"; // <-- 4 levels up to app/_lib
import { draftReportSections, buildProfileCopy } from "../../../../_lib/ai";

export async function POST(req: Request) {
  const sb = getServiceClient();

  const c = await cookies();
  const orgId = c.get("mc_org_id")?.value ?? null;
  if (!orgId) return NextResponse.json({ message: "no org" }, { status: 400 });

  const q = new URL(req.url).searchParams;
  const overwrite = (q.get("overwrite") || "false") === "true";

  const { data: fw, error: fwErr } = await sb
    .from("org_frameworks")
    .select("id, meta, frequency_meta")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (fwErr || !fw) return NextResponse.json({ message: fwErr?.message || "framework not found" }, { status: 404 });
  const frameworkId = fw.id as string;

  const meta = (fw.meta as any) || {};
  const legacy = (fw.frequency_meta as any) || {};
  const frequencyNames: Record<"A"|"B"|"C"|"D", string> =
    (meta.frequencies as any) ??
    (["A","B","C","D"].reduce((acc: any, k) => {
      acc[k] = legacy?.[k]?.name ?? k;
      return acc;
    }, {} as Record<"A"|"B"|"C"|"D", string>));

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
