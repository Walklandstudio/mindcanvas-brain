// apps/web/app/_lib/portal.ts
// Compatibility bridge so the rest of the app keeps working.
// Restores all previously-imported helpers and provides sane defaults.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

/** Generic server-side Supabase client (anon key, RLS applies). */
export function getServerSupabase(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Alias kept for legacy imports that expect `supabaseServer`. */
export const supabaseServer = getServerSupabase;

/** Admin/service client (server routes only; bypasses RLS). */
export function getAdminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Return the active org id.
 * Original impl used session cookies — for now we provide a robust shim:
 *  - If you pass a userId, we read their first membership.
 *  - If not, we fall back to the first row in portal_members (useful for CI/staging).
 */
export async function getActiveOrgId(userId?: string): Promise<string | null> {
  const sb = getAdminClient();

  if (userId) {
    const { data } = await sb
      .from("portal_members")
      .select("org_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    return (data as any)?.org_id ?? null;
  }

  // Fallback: first membership in the table (staging convenience)
  const { data } = await sb
    .from("portal_members")
    .select("org_id")
    .limit(1)
    .maybeSingle();

  return (data as any)?.org_id ?? null;
}

/** Fetch org-brand settings for header/report theming. */
export async function getOrgBrand(orgId: string) {
  const sb = getAdminClient();
  const { data } = await sb
    .from("org_brand_settings")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();
  return data ?? null;
}

/** Returns first org for a specific user (legacy alias). */
export async function getActiveOrg(userId?: string): Promise<string | null> {
  return getActiveOrgId(userId);
}

/** Guard: ensure user is a member of org. */
export async function ensurePortalMember(userId: string, orgId: string): Promise<boolean> {
  const sb = getAdminClient();
  const { data } = await sb
    .from("portal_members")
    .select("id")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .maybeSingle();
  return !!data;
}
