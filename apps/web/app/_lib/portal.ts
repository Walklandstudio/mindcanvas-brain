// apps/web/app/_lib/portal.ts
// Compatibility bridge for existing portal and admin code.
// Restores missing exports to unblock build.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE!;

/**
 * Generic server-side Supabase client (anon key)
 */
export function getServerSupabase() {
  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Admin-level Supabase client (service role key)
 */
export function getAdminClient() {
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Fetch active org for logged-in portal member.
 * (Returns first org membership if no slug supplied.)
 */
export async function getActiveOrg(userId?: string) {
  const sb = getAdminClient();
  if (!userId) return null;
  const { data } = await sb
    .from("portal_members")
    .select("org_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return data?.org_id ?? null;
}

/**
 * Simple brand settings lookup (org-scoped)
 */
export async function getOrgBrand(orgId: string) {
  const sb = getAdminClient();
  const { data } = await sb
    .from("org_brand_settings")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();
  return data ?? null;
}

/**
 * Ensure user is portal member of given org
 */
export async function ensurePortalMember(userId: string, orgId: string) {
  const sb = getAdminClient();
  const { data } = await sb
    .from("portal_members")
    .select("id")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .maybeSingle();
  return !!data;
}
