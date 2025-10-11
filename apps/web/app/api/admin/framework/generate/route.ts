// apps/web/app/api/admin/framework/generate/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";
import { suggestFrameworkNames } from "../../../../_lib/ai";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

async function handle() {
  const supabase = getServiceClient();

  // Ensure org row
  await supabase.from("organizations").upsert(
    { id: ORG_ID, name: "Demo Org" },
    { onConflict: "id" }
  );

  // Load onboarding context (branding + goals)
  const ob = await supabase
    .from("org_onboarding")
    .select("branding,goals")
    .eq("org_id", ORG_ID)
    .maybeSingle();
  if (ob.error) return NextResponse.json({ error: ob.error.message }, { status: 500 });

  const branding = ob.data?.branding ?? {};
  const goals = ob.data?.goals ?? {};
  const brandTone =
    (branding as any)?.brand_voice ?? (branding as any)?.tone ?? "confident, modern, human";

  const plan = await suggestFrameworkNames({
    industry: (goals as any)?.industry,
    sector: (goals as any)?.sector,
    brandTone,
    primaryGoal: (goals as any)?.primary_goal,
  });

  // Upsert framework shell + frequency_meta
  const fw0 = await supabase
    .from("org_frameworks")
    .select("id")
    .eq("org_id", ORG_ID)
    .maybeSingle();
  if (fw0.error) return NextResponse.json({ error: fw0.error.message }, { status: 500 });

  const frequency_meta = {
    A: { name: plan.frequencies.A, image_url: null, image_prompt: plan.imagePrompts.A },
    B: { name: plan.frequencies.B, image_url: null, image_prompt: plan.imagePrompts.B },
    C: { name: plan.frequencies.C, image_url: null, image_prompt: plan.imagePrompts.C },
    D: { name: plan.frequencies.D, image_url: null, image_prompt: plan.imagePrompts.D },
  };

  let frameworkId = fw0.data?.id as string | undefined;
  if (!frameworkId) {
    const created = await supabase
      .from("org_frameworks")
      .insert({ org_id: ORG_ID, name: "Signature", version: 1, frequency_meta })
      .select("id")
      .single();
    if (created.error) return NextResponse.json({ error: created.error.message }, { status: 500 });
    frameworkId = created.data.id;
  } else {
    const upd = await supabase
      .from("org_frameworks")
      .update({ frequency_meta })
      .eq("id", frameworkId);
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });
  }

  // Replace profiles with 8 fresh ones (A–D × 2)
  const del = await supabase.from("org_profiles").delete().eq("framework_id", frameworkId!);
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });

  let ordinal = 1;
  const rows = plan.profiles.map(
    (p: { name: string; frequency: "A" | "B" | "C" | "D" }) => ({
      org_id: ORG_ID,
      framework_id: frameworkId!,
      name: p.name,
      frequency: p.frequency,
      ordinal: ordinal++,
      image_url: null,
      image_prompt: `Brand-aligned icon or abstract illustration for "${p.name}" (${p.frequency}).`,
    })
  );

  const ins = await supabase.from("org_profiles").insert(rows).select("id");
  if (ins.error) {
    return NextResponse.json(
      { error: `Insert profiles failed: ${ins.error.message}` },
      { status: 500 }
    );
  }
  if (!ins.data || ins.data.length !== 8) {
    return NextResponse.json(
      { error: `Expected 8 profiles inserted, got ${ins.data?.length ?? 0}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    framework_id: frameworkId,
    count: ins.data.length,
  });
}

export async function POST() {
  return handle();
}
export async function GET() {
  // Accept GET to avoid 405 from accidental GET submissions
  return handle();
}
