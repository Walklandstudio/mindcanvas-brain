export const runtime = "nodejs";
// apps/web/app/api/admin/framework/generate-images/route.ts
import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";
import OpenAI from "openai";

const ORG_ID = "00000000-0000-0000-0000-000000000001";
const BUCKET = "framework";

export async function POST() {
  const supabase = getServiceClient();

  const [{ data: ob, error: obErr }, { data: fw, error: fwErr }] = await Promise.all([
    supabase.from("org_onboarding").select("branding").eq("org_id", ORG_ID).maybeSingle(),
    supabase.from("org_frameworks").select("id, frequency_meta").eq("org_id", ORG_ID).maybeSingle(),
  ]);
  if (obErr) return NextResponse.json({ error: obErr.message }, { status: 500 });
  if (fwErr) return NextResponse.json({ error: fwErr.message }, { status: 500 });
  if (!fw) return NextResponse.json({ error: "No framework found. Run AI Generate first." }, { status: 400 });

  const frameworkId: string = fw.id;
  const freqMeta: any = fw.frequency_meta ?? {};
  const branding = (ob?.branding as any) ?? {};
  const brandColor = branding?.primaryColor || branding?.primary || branding?.color || "#2d8fc4";

  const { data: profiles, error: pErr } = await supabase
    .from("org_profiles")
    .select("id, name, frequency, ordinal, image_url, image_prompt")
    .eq("org_id", ORG_ID)
    .eq("framework_id", frameworkId)
    .order("ordinal", { ascending: true });
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY missing." }, { status: 400 });
  const openai = new OpenAI({ apiKey });

  async function uploadPng(path: string, base64: string) {
    const buf = Buffer.from(base64, "base64");
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buf, {
      contentType: "image/png",
      upsert: true,
      cacheControl: "3600",
    });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return pub.publicUrl;
  }

  const freqLetters: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];
  const updatedFreqMeta = { ...freqMeta };
  let freqGenerated = 0;

  for (const F of freqLetters) {
    const current = updatedFreqMeta[F] || {};
    if (current.image_url) continue;

    const prompt =
      current.image_prompt ||
      `Abstract emblem for Frequency ${F}. Modern, minimal, professional. Primary brand color ${brandColor}.`;

    const res = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
    });
    const b64 = res.data?.[0]?.b64_json;
    if (!b64) continue;

    const path = `orgs/${ORG_ID}/frameworks/${frameworkId}/freq_${F}.png`;
    const publicUrl = await uploadPng(path, b64);
    updatedFreqMeta[F] = { ...(updatedFreqMeta[F] || {}), image_url: publicUrl };
    freqGenerated++;
  }

  let profilesGenerated = 0;
  if (profiles?.length) {
    for (const p of profiles) {
      if (p.image_url) continue;

      const prompt =
        p.image_prompt ||
        `Abstract emblem for profile "${p.name}" (Frequency ${p.frequency}). Corporate, minimal. Primary brand color ${brandColor}.`;

      const res = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
      });
      const b64 = res.data?.[0]?.b64_json;
      if (!b64) continue;

      const path = `orgs/${ORG_ID}/frameworks/${frameworkId}/profile_${String(p.ordinal).padStart(2, "0")}.png`;
      const publicUrl = await uploadPng(path, b64);

      const { error: updErr } = await supabase
        .from("org_profiles")
        .update({ image_url: publicUrl })
        .eq("id", p.id);
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

      profilesGenerated++;
    }
  }

  if (freqGenerated > 0) {
    const { error: fErr } = await supabase
      .from("org_frameworks")
      .update({ frequency_meta: updatedFreqMeta })
      .eq("id", frameworkId);
    if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    framework_id: frameworkId,
    generated: { frequencies: freqGenerated, profiles: profilesGenerated },
  });
}
