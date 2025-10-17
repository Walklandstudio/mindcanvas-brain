export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceClient } from "../../../../_lib/supabase";
import { draftReportSections, buildProfileCopy } from "../../../../_lib/ai";

function freqNamesFromLegacy(legacy: any) {
  return {
    A: legacy?.A?.name ?? "A",
    B: legacy?.B?.name ?? "B",
    C: legacy?.C?.name ?? "C",
    D: legacy?.D?.name ?? "D",
  } as Record<"A" | "B" | "C" | "D", string>;
}

async function ensureFrameworkAndProfiles(sb: any, orgId: string) {
  // Try existing
  let frameworkId: string | null = null;
  {
    const { data, error } = await sb
      .from("org_frameworks")
      .select("id, frequency_meta")
      .eq("org_id", orgId)
      .limit(1);
    if (error) throw new Error(error.message);
    const fw = Array.isArray(data) ? data[0] : data ?? null;
    if (fw?.id) {
      frameworkId = fw.id as string;
    } else {
      // create framework
      const { data: ins, error: e2 } = await sb
        .from("org_frameworks")
        .insert([{ org_id: orgId, frequency_meta: { A: { name: "A" }, B: { name: "B" }, C: { name: "C" }, D: { name: "D" } } }])
        .select("id")
        .maybeSingle();
      if (e2) throw new Error(e2.message);
      frameworkId = ins?.id ?? null;
      if (!frameworkId) throw new Error("failed to create framework");
    }
  }

  // Ensure 8 profiles
  const { data: profs, error: pErr } = await sb
    .from("org_profiles")
    .select("id")
    .eq("org_id", orgId)
    .eq("framework_id", frameworkId);
  if (pErr) throw new Error(pErr.message);

  if ((profs ?? []).length < 8) {
    const defaults = [
      { name: "Catalyst", frequency: "A" as const, ordinal: 1 },
      { name: "Visionary", frequency: "A" as const, ordinal: 2 },
      { name: "People Connector", frequency: "B" as const, ordinal: 3 },
      { name: "Culture Builder", frequency: "B" as const, ordinal: 4 },
      { name: "Process Coordinator", frequency: "C" as const, ordinal: 5 },
      { name: "System Planner", frequency: "C" as const, ordinal: 6 },
      { name: "Quality Controller", frequency: "D" as const, ordinal: 7 },
      { name: "Risk Optimiser", frequency: "D" as const, ordinal: 8 },
    ].map((p) => ({
      org_id: orgId,
      framework_id: frameworkId,
      name: p.name,
      frequency: p.frequency,
      ordinal: p.ordinal,
      image_url: null,
      summary: "",
      strengths: "",
    }));

    const { error: insErr } = await sb.from("org_profiles").insert(defaults);
    if (insErr) throw new Error(insErr.message);
  }

  return frameworkId!;
}

export async function POST(req: Request) {
  const sb = getServiceClient();

  const c = await cookies();
  let orgId = c.get("mc_org_id")?.value ?? null;
  if (!orgId) {
    // Create an org row so FKs pass (if organizations table exists)
    const { data: orgIns, error: orgErr } = await sb
      .from("organizations")
      .insert({ name: "Demo Org" })
      .select("id")
      .maybeSingle();
    if (orgErr) return NextResponse.json({ message: orgErr.message }, { status: 500 });
    orgId = orgIns?.id ?? null;
    if (!orgId) return NextResponse.json({ message: "failed to create org" }, { status: 500 });
  }

  // Ensure framework + profiles exist
  let frameworkId: string;
  try {
    frameworkId = await ensureFrameworkAndProfiles(sb, orgId);
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "ensure failed" }, { status: 500 });
  }

  const q = new URL(req.url).searchParams;
  const overwrite = (q.get("overwrite") || "false") === "true";

  // Read frequency names
  const { data: fwMeta } = await sb
    .from("org_frameworks")
    .select("frequency_meta")
    .eq("id", frameworkId)
    .eq("org_id", orgId)
    .maybeSingle();
  const frequencyNames = freqNamesFromLegacy(fwMeta?.frequency_meta || {});

  // Profiles
  const { data: profiles, error: pErr } = await sb
    .from("org_profiles")
    .select("id,name,frequency,summary")
    .eq("org_id", orgId)
    .eq("framework_id", frameworkId)
    .order("ordinal", { ascending: true });
  if (pErr) return NextResponse.json({ message: pErr.message }, { status: 500 });

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

  const res = NextResponse.json({ ok: true, count: results.length, results }, { status: 200 });
  // Ensure the cookie is set so subsequent pages work
  res.cookies.set("mc_org_id", orgId, { path: "/", sameSite: "lax" });
  return res;
}
