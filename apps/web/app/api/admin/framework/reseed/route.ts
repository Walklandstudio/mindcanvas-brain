// apps/web/app/api/admin/framework/reseed/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

const DEFAULT_PROFILES = [
  { name: "Visionary", frequency: "A", ordinal: 1 },
  { name: "Spark",     frequency: "A", ordinal: 2 },
  { name: "Connector", frequency: "B", ordinal: 3 },
  { name: "Deal-Maker",frequency: "B", ordinal: 4 },
  { name: "Coordinator",frequency: "C", ordinal: 5 },
  { name: "Planner",   frequency: "C", ordinal: 6 },
  { name: "Controller",frequency: "D", ordinal: 7 },
  { name: "Optimiser", frequency: "D", ordinal: 8 },
];

async function handle() {
  const supabase = getServiceClient();

  // Ensure org + framework
  await supabase.from("organizations").upsert(
    { id: ORG_ID, name: "Demo Org" },
    { onConflict: "id" }
  );

  let frameworkId: string | undefined;

  const fw0 = await supabase
    .from("org_frameworks")
    .select("id")
    .eq("org_id", ORG_ID)
    .maybeSingle();
  if (fw0.error) return NextResponse.json({ error: fw0.error.message }, { status: 500 });

  if (!fw0.data?.id) {
    const created = await supabase
      .from("org_frameworks")
      .insert({ org_id: ORG_ID, name: "Signature", version: 1, frequency_meta: { A:{},B:{},C:{},D:{} } })
      .select("id")
      .single();
    if (created.error) return NextResponse.json({ error: created.error.message }, { status: 500 });
    frameworkId = created.data.id;
  } else {
    frameworkId = fw0.data.id;
  }

  const del = await supabase.from("org_profiles").delete().eq("framework_id", frameworkId!);
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });

  const rows = DEFAULT_PROFILES.map((p) => ({
    org_id: ORG_ID,
    framework_id: frameworkId!,
    name: p.name,
    frequency: p.frequency,
    ordinal: p.ordinal,
  }));

  const ins = await supabase.from("org_profiles").insert(rows).select("id");
  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });

  return NextResponse.json({ ok: true, framework_id: frameworkId, count: ins.data.length });
}

export async function POST() { return handle(); }
export async function GET()  { return handle(); }
