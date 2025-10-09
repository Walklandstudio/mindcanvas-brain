// Server-only helpers for API routes
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!; // keep server-side only!

export function admin() {
  // Service role client – DO NOT expose SERVICE_ROLE to the browser.
  return createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

/**
 * Extract org_id for the current user using their Bearer access token.
 * Looks in org_members first, then falls back to organizations.owner_user_id.
 */
export async function orgIdFromAuth(authorizationHeader: string): Promise<string | null> {
  const token = authorizationHeader?.startsWith('Bearer ')
    ? authorizationHeader.slice('Bearer '.length)
    : null;

  if (!token) return null;

  const a = admin();
  const { data: userRes, error } = await a.auth.getUser(token);
  if (error || !userRes?.user?.id) return null;

  const userId = userRes.user.id;

  // Membership mapping
  const { data: mem } = await a
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .limit(1);

  if (mem?.[0]?.org_id) return mem[0].org_id as string;

  // Fallback: owner_user_id on organizations
  const { data: org } = await a
    .from('organizations')
    .select('id')
    .eq('owner_user_id', userId)
    .limit(1);

  return org?.[0]?.id ?? null;
}
