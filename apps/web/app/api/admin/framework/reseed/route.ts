// apps/web/app/api/admin/framework/reseed/route.ts
import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

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

  const { data: fw0, error: fwErr } = await supabase
    .from("org_frameworks")
    .select("id")
    .eq("org_id", ORG_ID)
    .maybeSingle();
  if (fwErr) return NextResponse.json({ error: fwErr.message }, { status: 500 });

  let frameworkId = fw0?.id;
  if (!frameworkId) {
    const { data, error } = await supabase
      .from("org_frameworks")
      .insert({ org_id: ORG_ID, name: "Signature", version: 1 })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    frameworkId = data.id;
  }

  const { error: delErr } = await supabase.from("org_profiles").delete().eq("framework_id", frameworkId);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  const rows = DEFAULT_PROFILES.map((p) => ({
    org_id: ORG_ID,
    framework_id: frameworkId!,
    name: p.name,
    frequency: p.frequency,
    ordinal: p.ordinal,
  }));
  const { error: insErr } = await supabase.from("org_profiles").insert(rows);
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, framework_id: frameworkId, count: rows.length });
}
