// apps/web/app/_lib/framework.ts
import { getServiceClient } from "./supabase";
import { suggestFrameworkNames, buildProfileCopy } from "./ai";

export const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Ensure a framework exists, ALWAYS refresh frequency names from onboarding,
 * and (only if needed) add the 8 profiles. Profiles are NOT deleted if they exist.
 * Inserts only core columns to avoid schema drift issues.
 */
export async function ensureFrameworkForOrg(orgId = DEMO_ORG_ID) {
  const sb = getServiceClient();

  // 1) Ensure org exists
  const org = await sb
    .from("organizations")
    .upsert({ id: orgId, name: "Demo Org" }, { onConflict: "id" })
    .select("id,name")
    .eq("id", orgId)
    .maybeSingle();
  if (org.error) throw new Error(`organizations upsert failed: ${org.error.message}`);
  const companyName = org.data?.name || "Demo Org";

  // 2) Find/create framework
  const fw0 = await sb
    .from("org_frameworks")
    .select("id,frequency_meta")
    .eq("org_id", orgId)
    .maybeSingle();
  if (fw0.error) throw new Error(`org_frameworks select failed: ${fw0.error.message}`);
  let frameworkId = fw0.data?.id as string | undefined;

  if (!frameworkId) {
    const created = await sb
      .from("org_frameworks")
      .insert({ org_id: orgId, name: "Signature", version: 1 })
      .select("id")
      .single();
    if (created.error) throw new Error(`org_frameworks insert failed: ${created.error.message}`);
    frameworkId = created.data.id;
  }

  // 3) Load onboarding (tolerant)
  const ob = await sb.from("org_onboarding").select("*").eq("org_id", orgId).maybeSingle();
  if (ob.error) throw new Error(`org_onboarding fetch failed: ${ob.error.message}`);

  const branding = (ob.data as any)?.branding ?? {};
  const goals = (ob.data as any)?.goals ?? {};
  const brandTone =
    (branding?.brand_voice ?? branding?.tone ?? "confident, modern, human") as string;
  const industry = (goals?.industry ?? "") as string;
  const sector = (goals?.sector ?? "") as string;
  const primaryGoal = (goals?.primary_goal ?? "") as string;

  // 4) Names from AI (with safe fallback)
  const plan = await suggestFrameworkNames({ industry, sector, brandTone, primaryGoal });

  // 5) ALWAYS refresh frequency names on the framework
  const frequency_meta = {
    A: { name: plan.frequencies.A, image_url: null, image_prompt: plan.imagePrompts.A },
    B: { name: plan.frequencies.B, image_url: null, image_prompt: plan.imagePrompts.B },
    C: { name: plan.frequencies.C, image_url: null, image_prompt: plan.imagePrompts.C },
    D: { name: plan.frequencies.D, image_url: null, image_prompt: plan.imagePrompts.D },
  };

  const upd = await sb
    .from("org_frameworks")
    .update({ frequency_meta })
    .eq("id", frameworkId!);
  if (upd.error) throw new Error(`org_frameworks update failed: ${upd.error.message}`);

  // 6) If there are already ≥8 profiles, return them (don’t delete)
  const existing = await sb
    .from("org_profiles")
    .select("id,name,frequency,ordinal,image_url,summary,strengths")
    .eq("org_id", orgId)
    .eq("framework_id", frameworkId!)
    .order("ordinal", { ascending: true });

  if (existing.error) throw new Error(`org_profiles fetch failed: ${existing.error.message}`);
  if ((existing.data?.length ?? 0) >= 8) {
    return { frameworkId, frequency_meta, profiles: existing.data! };
  }

  // 7) Otherwise, insert 8 profiles (core columns only)
  let ordinal = 1;
  const rows: any[] = [];
  for (const p of plan.profiles) {
    const copy = await buildProfileCopy({
      brandTone,
      industry,
      sector,
      company: companyName,
      frequencyName: (frequency_meta as any)[p.frequency].name,
      profileName: p.name,
    });
    rows.push({
      org_id: orgId,
      framework_id: frameworkId!,
      name: p.name,
      frequency: p.frequency, // 'A'|'B'|'C'|'D'
      ordinal: ordinal++,
      image_url: null,
      image_prompt: `Abstract emblem for "${p.name}" (${p.frequency}).`,
      summary: copy.summary,
      strengths: copy.strengths,
    });
  }

  const ins = await sb.from("org_profiles").insert(rows).select("id");
  if (ins.error) throw new Error(`org_profiles insert failed: ${ins.error.message}`);

  const after = await sb
    .from("org_profiles")
    .select("id,name,frequency,ordinal,image_url,summary,strengths")
    .eq("org_id", orgId)
    .eq("framework_id", frameworkId!)
    .order("ordinal", { ascending: true });
  if (after.error) throw new Error(`org_profiles fetch after insert failed: ${after.error.message}`);

  return { frameworkId, frequency_meta, profiles: after.data || [] };
}
