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
 * Idempotent: if the framework already has >= 8 profiles, returns them without writing.
 * Tries to satisfy stricter schemas by providing company_name, first/last_name, contact_email.
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

  // 2) If a framework with profiles already exists, return it
  const fw0 = await supabase
    .from("org_frameworks")
    .select("id,frequency_meta")
    .eq("org_id", orgId)
    .maybeSingle();
  if (fw0.error) throw new Error(fw0.error.message);

  let frameworkId = fw0.data?.id as string | undefined;
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

  // 3) Onboarding context: also try to fetch a contact email we can store
  const ob = await supabase
    .from("org_onboarding")
    .select("branding,goals,create_account,company")
    .eq("org_id", orgId)
    .maybeSingle();
  if (ob.error) throw new Error(ob.error.message);

  const branding = ob.data?.branding ?? {};
  const goals = ob.data?.goals ?? {};
  const createAccount = (ob.data?.create_account as any) || {};
  const company = (ob.data?.company as any) || {};

  const brandTone =
    (branding as any)?.brand_voice ?? (branding as any)?.tone ?? "confident, modern, human";
  const industry = (goals as any)?.industry ?? "";
  const sector = (goals as any)?.sector ?? "";
  const primaryGoal = (goals as any)?.primary_goal ?? "";

  // Prefer onboarding email; fall back to a safe placeholder
  const contactEmail =
    String(createAccount.email || company.email || "").trim() || "demo@example.com";

  // 4) Ask AI (with fallback) for frequency + profile names
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

  // 6) Clear stale rows (we’re about to insert 8)
  const del = await supabase.from("org_profiles").delete().eq("framework_id", frameworkId!);
  if (del.error) throw new Error(del.error.message);

  // 7) Build 8 rows with copy and fields to satisfy stricter schemas
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
      // app-required
      name: p.name,
      frequency: p.frequency,
      ordinal: ordinal++,
      // stricter-schema fields (ignored if columns don’t exist)
      company_name: companyName,
      first_name: fl.first,
      last_name: fl.last,
      contact_email: contactEmail,
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
