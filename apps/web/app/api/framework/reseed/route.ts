// app/api/admin/framework/reseed/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE!;

export async function POST(req: Request) {
  try {
    const { orgId } = await req.json();
    if (!orgId) return NextResponse.json({ error: "Missing orgId" }, { status: 400 });

    const supabase = createClient(url, service, { auth: { persistSession: false } });

    // 1) Ensure there is a framework for this org
    const { data: fwExisting, error: fwErr } = await supabase
      .from("org_frameworks")
      .select("id")
      .eq("org_id", orgId)
      .limit(1)
      .maybeSingle();

    if (fwErr) throw fwErr;

    let frameworkId = fwExisting?.id;
    if (!frameworkId) {
      const { data: fwIns, error: fwInsErr } = await supabase
        .from("org_frameworks")
        .insert([{ org_id: orgId, name: "TEMA – Default" }])
        .select("id")
        .single();
      if (fwInsErr) throw fwInsErr;
      frameworkId = fwIns.id;
    }

    // 2) Insert 8 profiles (ordinal 1..8) if not present
    const defaultProfiles = [
      { name: "P1", frequency: "A", ordinal: 1 },
      { name: "P2", frequency: "A", ordinal: 2 },
      { name: "P3", frequency: "B", ordinal: 3 },
      { name: "P4", frequency: "B", ordinal: 4 },
      { name: "P5", frequency: "C", ordinal: 5 },
      { name: "P6", frequency: "C", ordinal: 6 },
      { name: "P7", frequency: "D", ordinal: 7 },
      { name: "P8", frequency: "D", ordinal: 8 },
    ];

    for (const p of defaultProfiles) {
      const { error: upErr } = await supabase
        .from("org_profiles")
        .upsert(
          {
            org_id: orgId,
            framework_id: frameworkId,
            name: p.name,
            frequency: p.frequency,
            ordinal: p.ordinal,
          },
          { onConflict: "org_id,framework_id,ordinal" }
        );
      if (upErr) throw upErr;
    }

    return NextResponse.json({ ok: true, frameworkId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed reseed" }, { status: 500 });
  }
}
