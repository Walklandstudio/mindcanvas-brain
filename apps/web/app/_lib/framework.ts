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
 * Ensure 1 framework + 8 profiles exist for org.
 * Inserts only core columns to avoid schema drift issues.
 * Idempotent: if >=8 profiles exist, returns them.
 */
export async function ensureFrameworkForOrg(orgId = DEMO_ORG_ID) {
  const supabase = getServiceClient();

  // Ensure org exists
  const org = await supabase
    .from("organizations")
    .upsert({ id: orgId, name: "Demo Org" }, { onConflict: "id" })
    .select("id,name")
    .eq("id", orgId)
    .maybeSingle();
  if (org.error) throw new Error(`organizations upsert failed: ${org.error.message}`);
  const companyName = org.data?.name || "Demo Org";

  // Existing framework?
  const fw0 = await supabase
    .from("org_frameworks")
    .select("id,frequency_meta")
    .eq("org_id", orgId)
    .maybeSingle();
  if (fw0.error) throw new Error(`org_frameworks select failed: ${fw0.error.message}`);
  let frameworkId = fw0.data?.id as string | undefined;

  if (frameworkId) {
    const existing = await supabase
      .from("org_profiles")
      .select("id,name,frequency,ordinal,image_url,summary,strengths")
      .eq("org_id", orgId)
      .eq("framework_id", frameworkId)
      .order("ordinal", { ascending: true });
    if (existing.error) throw new Error(`org_profiles fetch failed: ${existing.error.message}`);
    if ((existing.data?.length ?? 0) >= 8) {
      return { frameworkId, frequency_meta: fw0.data?.frequency_meta || {}, profiles: existing.data! };
    }
  }

  // Onboarding context
  const ob = await supabase
    .from("org_onboarding")
    .select("branding,goals,create_account,company")
    .eq("org_id", orgId)
    .maybeSingle();
  if (ob.error) throw new Error(`org_onboarding fetch failed: ${ob.error.message}`);

  const branding = ob.data?.branding ?? {};
  const goals = ob.data?.goals ?? {};
  const brandTone =
    (branding as any)?.brand_voice ?? (branding as any)?.tone ?? "confident, modern, human";
  const industry = (goals as any)?.industry ?? "";
  const sector = (goals as any)?.sector ?? "";
  const primaryGoal = (goals as any)?.primary_goal ?? "";

  // Names with fallback
  const plan = await suggestFrameworkNames({ industry, sector, brandTone, primaryGoal });

  // Framework upsert
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
    if (created.error) throw new Error(`org_frameworks insert failed: ${created.error.message}`);
    frameworkId = created.data.id;
  } else {
    const upd = await supabase
      .from("org_frameworks")
      .update({ frequency_meta })
      .eq("id", frameworkId);
    if (upd.error) throw new Error(`org_frameworks update failed: ${upd.error.message}`);
  }

  // Clear stale profiles
  const del = await supabase.from("org_profiles").delete().eq("framework_id", frameworkId!);
  if (del.error) throw new Error(`org_profiles delete failed: ${del.error.message}`);

  // Build 8 rows with CORE columns only (others are optional and now nullable/defaulted)
  let ordinal = 1;
  const coreRows: any[] = [];
  for (const p of plan.profiles) {
    const copy = await buildProfileCopy({
      brandTone, industry, sector, company: companyName,
      frequencyName: (frequency_meta as any)[p.frequency].name,
      profileName: p.name,
    });
    coreRows.push({
      org_id: orgId,
      framework_id: frameworkId!,
      name: p.name,
      frequency: p.frequency,           // 'A'|'B'|'C'|'D'
      ordinal: ordinal++,
      image_url: null,                  // ok if column missing/nullable
      image_prompt: `Abstract emblem for "${p.name}" (${p.frequency}) aligned to ${companyName}.`,
      summary: copy.summary,            // ok if column missing/nullable
      strengths: copy.strengths,        // ok if column missing/nullable
    });
  }

  const ins = await supabase.from("org_profiles").insert(coreRows).select("id");
  if (ins.error) throw new Error(`org_profiles insert failed: ${ins.error.message}`);

  const after = await supabase
    .from("org_profiles")
    .select("id,name,frequency,ordinal,image_url,summary,strengths")
    .eq("org_id", orgId)
    .eq("framework_id", frameworkId!)
    .order("ordinal", { ascending: true });
  if (after.error) throw new Error(`org_profiles fetch after insert failed: ${after.error.message}`);

  return { frameworkId: frameworkId!, frequency_meta, profiles: after.data || [] };
}
