// apps/web/app/_lib/supabaseAdmin.ts
// Server-only Supabase clients. Do NOT import into client components.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

/** Admin/service client (bypasses RLS in server routes). */
export function supabaseAdmin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Named export for legacy imports expecting getAdminClient from this file. */
export function getAdminClient(): SupabaseClient {
  return supabaseAdmin();
}

/** Anonymous server client (RLS applies). */
export function supabaseServerAnon(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
