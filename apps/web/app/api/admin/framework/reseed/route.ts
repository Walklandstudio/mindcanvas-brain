import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceClient } from "@/app/_lib/supabase";
import { suggestFrameworkNames, generateImageURL } from "@/app/_lib/ai";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

/*
Assumes tables (adjust names if yours differ):
  - org_frameworks(id uuid pk default gen_random_uuid(), org_id uuid unique, name text, meta jsonb, updated_at timestamptz)
  - org_profiles(id uuid pk default gen_random_uuid(), org_id uuid, framework_id uuid, name text, frequency text, image_url text, ordinal int)
*/

export async function POST() {
  const cookieStore = await cookies();
  let orgId = cookieStore.get("mc_org_id")?.value || randomUUID();

  const supabase = getServiceClient();

  // 1) Pull onboarding data
  const { data: ob } = await supabase
    .from("org_onboarding")
    .select("data")
    .eq("org_id", orgId)
    .maybeSingle();

  const od = (ob?.data as any) ?? {};
  const industry = od?.company?.industry ?? "General";
  const sector = od?.company?.sector ?? "General";
  const brandTone = od?.branding?.tone ?? od?.branding?.brandTone ?? "confident, modern, human";
  const primaryGoal = od?.goals?.primaryGoal ?? "Improve team performance";

  // 2) Ask AI to suggest frequency labels + 8 profiles, and prompts
  const suggestion = await suggestFrameworkNames({ industry, sector, brandTone, primaryGoal });
  const frequencies = suggestion.frequencies; // {A,B,C,D}
  const pairs = suggestion.profiles as Array<{ name: string; frequency: "A"|"B"|"C"|"D" }>;
  const prompts = suggestion.imagePrompts as Record<"A"|"B"|"C"|"D", string>;

  // 3) Upsert the framework row for this org, store frequencies in meta
  const { data: fwRow, error: fwErr } = await supabase
    .from("org_frameworks")
    .upsert(
      { org_id: orgId, name: "Default Framework", meta: { frequencies } },
      { onConflict: "org_id" }
    )
    .select("id")
    .maybeSingle();

  if (fwErr) return NextResponse.json({ message: fwErr.message }, { status: 500 });

  const frameworkId = fwRow?.id;
  if (!frameworkId) return NextResponse.json({ message: "framework id missing" }, { status: 500 });

  // 4) Reset any existing profiles for idempotency
  await supabase.from("org_profiles").delete().eq("org_id", orgId).eq("framework_id", frameworkId);

  // 5) Build 8 new profiles using AI images (safe fallback inside helper)
  const rows = [];
  for (let i = 0; i < pairs.length; i++) {
    const p = pairs[i];
    const ordinal = i + 1;
    const prompt = (prompts?.[p.frequency] as string) || "abstract geometric brand icon";
    const image_url = await generateImageURL(prompt);
    rows.push({
      id: randomUUID(),
      org_id: orgId,
      framework_id: frameworkId,
      name: p.name,
      frequency: p.frequency,
      ordinal,
      image_url,
    });
  }

  const { error: insErr } = await supabase.from("org_profiles").insert(rows);
  if (insErr) return NextResponse.json({ message: insErr.message }, { status: 500 });

  const res = NextResponse.json({ ok: true, frameworkId, frequencies, count: rows.length }, { status: 200 });
  if (!cookieStore.get("mc_org_id")?.value) {
    res.cookies.set("mc_org_id", orgId, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 180, path: "/" });
  }
  return res;
}
