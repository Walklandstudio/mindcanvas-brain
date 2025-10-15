export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceClient } from "../../../../_lib/supabase";
import { suggestFrameworkNames, buildProfileCopy } from "../../../../_lib/ai";

function defaults() {
  return {
    frequencies: { A: "Pioneers", B: "Collaborators", C: "Operators", D: "Analysts" },
    profiles: [
      { name: "Catalyst", frequency: "A" as const },
      { name: "Visionary", frequency: "A" as const },
      { name: "People Connector", frequency: "B" as const },
      { name: "Culture Builder", frequency: "B" as const },
      { name: "Process Coordinator", frequency: "C" as const },
      { name: "System Planner", frequency: "C" as const },
      { name: "Quality Controller", frequency: "D" as const },
      { name: "Risk Optimiser", frequency: "D" as const },
    ],
  };
}

export async function POST() {
  const sb = getServiceClient();
  const c = await cookies();                         // ⬅️ await here
  let orgId = c.get("mc_org_id")?.value ?? null;

  if (!orgId) {
    const { data: orgIns, error: orgErr } = await sb
      .from("organizations")
      .insert({ name: "Demo Org" })
      .select("id")
      .maybeSingle();
    if (orgErr) return NextResponse.json({ message: orgErr.message }, { status: 500 });
    orgId = orgIns?.id as string;
  }

  const { data: ob } = await sb
    .from("org_onboarding")
    .select("data")
    .eq("org_id", orgId)
    .maybeSingle();

  const od = (ob?.data as any) ?? {};
  const industry = od?.company?.industry ?? od?.goals?.industry ?? "General";
  const sector   = od?.company?.sector   ?? od?.goals?.sector   ?? "General";
  const brandTone =
    od?.branding?.tone ?? od?.branding?.brandTone ?? "confident, modern, human";
  const primaryGoal = od?.goals?.primaryGoal ?? "Improve team performance";
  const company = od?.account?.companyName ?? od?.company?.name ?? "Company";

  const ai = await suggestFrameworkNames({
    industry,
    sector,
    brandTone,
    primaryGoal,
  });

  const freqs = ai?.frequencies ?? defaults().frequencies;
  const profs =
    (ai?.profiles as Array<{ name: string; frequency: "A" | "B" | "C" | "D" }>) ??
    defaults().profiles;

  let frameworkId: string | null = null;
  {
    const { data } = await sb
      .from("org_frameworks")
      .select("id")
      .eq("org_id", orgId)
      .limit(1);
    const fw = Array.isArray(data) ? data[0] : data ?? null;

    if (fw?.id) {
      frameworkId = fw.id as string;
    } else {
      const legacyFreqMeta = {
        A: { name: freqs.A },
        B: { name: freqs.B },
        C: { name: freqs.C },
        D: { name: freqs.D },
      };
      const { data: ins, error } = await sb
        .from("org_frameworks")
        .insert([{ org_id: orgId, frequency_meta: legacyFreqMeta }])
        .select("id")
        .maybeSingle();
      if (error) return NextResponse.json({ message: error.message }, { status: 500 });
      frameworkId = ins?.id ?? null;
    }
  }

  if (!frameworkId) {
    return NextResponse.json({ message: "failed to ensure framework" }, { status: 500 });
  }

  const rows = await Promise.all(
    profs.slice(0, 8).map(async (p, i) => {
      const copy = await buildProfileCopy({
        brandTone,
        industry,
        sector,
        company,
        frequencyName: freqs[p.frequency] ?? p.frequency,
        profileName: p.name,
      });

      return {
        org_id: orgId!,
        framework_id: frameworkId!,
        name: p.name,
        frequency: p.frequency,
        ordinal: i + 1,
        image_url: null,
        summary: copy.summary ?? "",
        strengths: (copy.strengths ?? []).join("\n"),
      };
    })
  );

  const { error: delErr } = await sb
    .from("org_profiles")
    .delete()
    .eq("org_id", orgId)
    .eq("framework_id", frameworkId);
  if (delErr) return NextResponse.json({ message: delErr.message }, { status: 500 });

  const { error: insErr } = await sb.from("org_profiles").insert(rows);
  if (insErr) return NextResponse.json({ message: insErr.message }, { status: 500 });

  const res = NextResponse.json({ ok: true, orgId, frameworkId });
  res.cookies.set("mc_org_id", orgId, { path: "/", sameSite: "lax" });
  return res;
}
