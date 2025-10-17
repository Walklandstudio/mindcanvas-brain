export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceClient } from "../../../../_lib/supabase";

function defaultFrequencyNames() {
  return { A: "A", B: "B", C: "C", D: "D" };
}
function defaultProfiles() {
  return [
    { name: "Catalyst", frequency: "A" as const, ordinal: 1 },
    { name: "Visionary", frequency: "A" as const, ordinal: 2 },
    { name: "People Connector", frequency: "B" as const, ordinal: 3 },
    { name: "Culture Builder", frequency: "B" as const, ordinal: 4 },
    { name: "Process Coordinator", frequency: "C" as const, ordinal: 5 },
    { name: "System Planner", frequency: "C" as const, ordinal: 6 },
    { name: "Quality Controller", frequency: "D" as const, ordinal: 7 },
    { name: "Risk Optimiser", frequency: "D" as const, ordinal: 8 },
  ];
}

/** Create org if missing, then framework + 8 profiles. Idempotent. */
export async function POST() {
  const sb = getServiceClient();
  const c = await cookies();

  let orgId = c.get("mc_org_id")?.value ?? null;

  // 1) Ensure org
  if (!orgId) {
    // Try to reuse any org from org_onboarding; if none, create a minimal one.
    let createdOrgId: string | null = null;

    // Attempt to create a minimal organizations row (if table exists + allowed)
    const { data: orgIns, error: orgErr } = await sb
      .from("organizations")
      .insert({ name: "Demo Org" })
      .select("id")
      .maybeSingle();

    if (orgErr) {
      // If organizations table is locked down in RLS, fall back to a random UUID-less path:
      // but most schemas have this FK; we surface the error if that’s the case.
      return NextResponse.json({ message: orgErr.message }, { status: 500 });
    }
    createdOrgId = orgIns?.id ?? null;
    if (!createdOrgId) {
      return NextResponse.json({ message: "failed to create org" }, { status: 500 });
    }
    orgId = createdOrgId;
  }

  // 2) Ensure framework
  let frameworkId: string | null = null;
  {
    const { data } = await sb
      .from("org_frameworks")
      .select("id, frequency_meta")
      .eq("org_id", orgId)
      .limit(1);
    const fwRow = Array.isArray(data) ? data[0] : data ?? null;

    if (fwRow?.id) {
      frameworkId = fwRow.id as string;
    } else {
      const freqMeta = defaultFrequencyNames();
      const { data: ins, error } = await sb
        .from("org_frameworks")
        .insert([{ org_id: orgId, frequency_meta: freqMeta }])
        .select("id")
        .maybeSingle();
      if (error) return NextResponse.json({ message: error.message }, { status: 500 });
      frameworkId = ins?.id ?? null;
      if (!frameworkId) return NextResponse.json({ message: "failed to create framework" }, { status: 500 });
    }
  }

  // 3) Ensure 8 profiles
  const { data: existingProfiles, error: pErr } = await sb
    .from("org_profiles")
    .select("id")
    .eq("org_id", orgId)
    .eq("framework_id", frameworkId);
  if (pErr) return NextResponse.json({ message: pErr.message }, { status: 500 });

  if ((existingProfiles ?? []).length < 8) {
    const base = defaultProfiles().map((p) => ({
      org_id: orgId,
      framework_id: frameworkId,
      name: p.name,
      frequency: p.frequency,
      ordinal: p.ordinal,
      image_url: null,
      summary: "",
      strengths: "",
    }));
    const { error: bulkErr } = await sb.from("org_profiles").insert(base);
    if (bulkErr) return NextResponse.json({ message: bulkErr.message }, { status: 500 });
  }

  // 4) Return and set cookie if we had to create the org
  const res = NextResponse.json({ ok: true, orgId, frameworkId });
  const currentCookie = c.get("mc_org_id")?.value;
  if (!currentCookie) {
    res.cookies.set("mc_org_id", orgId!, { path: "/", sameSite: "lax" });
  }
  return res;
}
