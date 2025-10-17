// apps/web/app/_lib/supabaseAdmin.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the SERVICE ROLE key.
 * Requires:
 *  - SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE
 */
export function getAdminClient(): SupabaseClient {
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE || "";
  if (!url || !serviceRole) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE in environment."
    );
  }
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
