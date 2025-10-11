// apps/web/app/api/admin/framework/generate/route.ts
import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";
import { suggestFrameworkNames } from "../../../../_lib/ai";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

export async function POST() {
  const supabase = getServiceClient();

  const { data: ob, error: obErr } = await supabase
    .from("org_onboarding")
    .select("branding,goals")
    .eq("org_id", ORG_ID)
    .maybeSingle();
  if (obErr) return NextResponse.json({ error: obErr.message }, { status: 500 });

  const branding = ob?.branding ?? {};
  const goals = ob?.goals ?? {};
  const brandTone = (branding as any)?.brand_voice ?? (branding as any)?.tone ?? "confident, modern, human";

  const plan = await suggestFrameworkNames({
    industry: (goals as any)?.industry,
    sector: (goals as any)?.sector,
    brandTone,
    primaryGoal: (goals as any)?.primary_goal,
  });

  const { data: fw0, error: fwErr } = await supabase
    .from("org_frameworks")
    .select("id")
    .eq("org_id", ORG_ID)
    .maybeSingle();
  if (fwErr) return NextResponse.json({ error: fwErr.message }, { status: 500 });

  let frameworkId = fw0?.id;
  const freqMeta = {
    A: { name: plan.frequencies.A, image_url: null, image_prompt: plan.imagePrompts.A },
    B: { name: plan.frequencies.B, image_url: null, image_prompt: plan.imagePrompts.B },
    C: { name: plan.frequencies.C, image_url: null, image_prompt: plan.imagePrompts.C },
    D: { name: plan.frequencies.D, image_url: null, image_prompt: plan.imagePrompts.D },
  };

  if (!frameworkId) {
    const { data: created, error: cErr } = await supabase
      .from("org_frameworks")
      .insert({
        org_id: ORG_ID,
        name: "Signature",
        version: 1,
        frequency_meta: freqMeta,
      })
      .select("id")
      .single();
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
    frameworkId = created.id;
  } else {
    const { error: upErr } = await supabase
      .from("org_frameworks")
      .update({ frequency_meta: freqMeta })
      .eq("id", frameworkId);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { error: delErr } = await supabase.from("org_profiles").delete().eq("framework_id", frameworkId!);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  let ordinal = 1;
  const rows = plan.profiles.map((p: { name: string; frequency: "A"|"B"|"C"|"D" }) => ({
    org_id: ORG_ID,
    framework_id: frameworkId!,
    name: p.name,
    frequency: p.frequency,
    ordinal: ordinal++,
    image_url: null,
    image_prompt: `Brand-aligned icon or abstract illustration for "${p.name}" (${p.frequency}).`,
  }));
  const { error: insErr } = await supabase.from("org_profiles").insert(rows);
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, framework_id: frameworkId, plan, count: rows.length });
}
