// apps/web/app/_lib/framework.ts
import { getServiceClient } from "./supabase";
import { suggestFrameworkNames, buildProfileCopy } from "./ai";

export const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001";

function splitNameToFirstLast(n: string) {
  const parts = (n || "").trim().split(/\s+/);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

/**
 * Ensures the org has a framework and 8 profiles.
 * Idempotent: if profiles already exist for the framework, it returns them.
 * Attempts to satisfy extra NOT NULL columns like company_name / first_name / last_name.
 */
export async function ensureFrameworkForOrg(orgId = DEMO_ORG_ID) {
  const supabase = getServiceClient();

  // 1) Ensure org row & get name
  const org = await supabase
    .from("organizations")
    .upsert({ id: orgId, name: "Demo Org" }, { onConflict: "id" })
    .select("id,name")
    .eq("id", orgId)
    .maybeSingle();
  if (org.error) throw new Error(org.error.message);
  const companyName = org.data?.name || "Demo Org";

  // 2) Read existing framework + profiles
  const fw0 = await supabase.from("org_frameworks").select("id,frequency_meta").eq("org_id", orgId).maybeSingle();
  if (fw0.error) throw new Error(fw0.error.message);

  let frameworkId = fw0.data?.id as string | undefined;

  // If profiles already exist, return them (nothing to do)
  if (frameworkId) {
    const existing = await supabase
      .from("org_profiles")
      .select("id,name,frequency,ordinal,image_url,summary,strengths")
      .eq("org_id", orgId)
      .eq("framework_id", frameworkId)
      .order("ordinal", { ascending: true });
    if (existing.error) throw new Error(existing.error.message);
    if ((existing.data?.length ?? 0) >= 8) {
      return {
        frameworkId,
        frequency_meta: fw0.data?.frequency_meta || {},
        profiles: existing.data!,
      };
    }
  }

  // 3) Pull onboarding context
  const ob = await supabase
    .from("org_onboarding")
    .select("branding,goals")
    .eq("org_id", orgId)
    .maybeSingle();
  if (ob.error) throw new Error(ob.error.message);

  const branding = ob.data?.branding ?? {};
  const goals = ob.data?.goals ?? {};
  const brandTone = (branding as any)?.brand_voice ?? (branding as any)?.tone ?? "confident, modern, human";
  const industry = (goals as any)?.industry ?? "";
  const sector = (goals as any)?.sector ?? "";
  const primaryGoal = (goals as any)?.primary_goal ?? "";

  // 4) Ask AI (with safe fallback) for names
  const plan = await suggestFrameworkNames({ industry, sector, brandTone, primaryGoal });

  // 5) Upsert framework & meta
  const frequency_meta = {
    A: { name: plan.frequencies.A, image_url: null, image_prompt: plan.imagePrompts.A },
    B: { name: plan.frequencies.B, image_url: null, image_prompt: plan.imagePrompts.B },
    C: { name: plan.frequencies.C, image_url: null, image_prompt: plan.imagePrompts.C },
    D: { name: plan.frequencies.D, image_url: null, image_prompt: plan.imagePrompts.D },
  };

  if (!frameworkId) {
    const created = await supabase
      .from("org_frameworks")
      .insert({ org_id: orgId, name: "Signature", version: 1, frequency_meta })
      .select("id")
      .single();
    if (created.error) throw new Error(created.error.message);
    frameworkId = created.data.id;
  } else {
    const upd = await supabase
      .from("org_frameworks")
      .update({ frequency_meta })
      .eq("id", frameworkId);
    if (upd.error) throw new Error(upd.error.message);
  }

  // 6) Clear any stale rows (we’re about to insert 8)
  const del = await supabase.from("org_profiles").delete().eq("framework_id", frameworkId!);
  if (del.error) throw new Error(del.error.message);

  // 7) Build 8 rows with copy. Try to satisfy possible extra NOT NULLs.
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
    const fl = splitNameToFirstLast(p.name);

    rows.push({
      org_id: orgId,
      framework_id: frameworkId!,
      // common columns
      name: p.name,
      frequency: p.frequency,
      ordinal: ordinal++,
      // brand columns
      company_name: companyName,      // if present + NOT NULL
      first_name: fl.first,           // if present + NOT NULL
      last_name: fl.last,             // if present + NOT NULL
      // media + copy
      image_url: null,
      image_prompt: `Abstract emblem for "${p.name}" (${p.frequency}) aligned to ${companyName}.`,
      summary: copy.summary,
      strengths: copy.strengths,
    });
  }

  const ins = await supabase.from("org_profiles").insert(rows).select("id");
  if (ins.error) throw new Error(ins.error.message);

  const after = await supabase
    .from("org_profiles")
    .select("id,name,frequency,ordinal,image_url,summary,strengths")
    .eq("org_id", orgId)
    .eq("framework_id", frameworkId!)
    .order("ordinal", { ascending: true });

  if (after.error) throw new Error(after.error.message);

  return {
    frameworkId: frameworkId!,
    frequency_meta,
    profiles: after.data || [],
  };
}
