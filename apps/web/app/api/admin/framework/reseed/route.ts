// apps/web/app/api/admin/framework/reseed/route.ts
import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";

const DEFAULT_PROFILES = [
  { name: "Visionary", frequency: "A", ordinal: 1 },
  { name: "Spark",     frequency: "A", ordinal: 2 },
  { name: "Anchor",    frequency: "B", ordinal: 3 },
  { name: "Architect", frequency: "B", ordinal: 4 },
  { name: "Guardian",  frequency: "C", ordinal: 5 },
  { name: "Operator",  frequency: "C", ordinal: 6 },
  { name: "Analyst",   frequency: "D", ordinal: 7 },
  { name: "Precision", frequency: "D", ordinal: 8 },
];

export async function POST() {
  const supabase = getServiceClient();
  const orgId = "00000000-0000-0000-0000-000000000001";

  // Ensure framework
  const { data: existingFw, error: fwErr } = await supabase
    .from("org_frameworks")
    .select("id")
    .eq("org_id", orgId)
    .limit(1)
    .maybeSingle();

  if (fwErr) return NextResponse.json({ error: fwErr.message }, { status: 500 });

  let frameworkId = existingFw?.id;
  if (!frameworkId) {
    const { data, error } = await supabase
      .from("org_frameworks")
      .insert({ org_id: orgId, name: "Signature", version: 1 })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    frameworkId = data.id;
  }

  // Clear and seed 8 profiles
  const { error: delErr } = await supabase.from("org_profiles").delete().eq("framework_id", frameworkId);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  const rows = DEFAULT_PROFILES.map((p) => ({
    org_id: orgId,
    framework_id: frameworkId,
    name: p.name,
    frequency: p.frequency,
    ordinal: p.ordinal,
  }));

  const { error: insErr } = await supabase.from("org_profiles").insert(rows);
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, framework_id: frameworkId, count: rows.length });
}
