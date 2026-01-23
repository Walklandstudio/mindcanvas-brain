// apps/web/app/_lib/supabaseAdmin.ts
// Server-only Supabase clients. Do NOT import into client components.

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Prefer the canonical name used elsewhere in your codebase.
// Fallback to SUPABASE_SERVICE_ROLE if that's what exists in some environments.
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || "";

/** Admin/service client (bypasses RLS in server routes). */
export function supabaseAdmin(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Admin client pinned to the `portal` schema.
 * Use this so routes don't accidentally hit public tables.
 */
export function portalAdmin() {
  return supabaseAdmin().schema("portal");
}

/** Named export for legacy imports expecting getAdminClient from this file. */
export function getAdminClient(): SupabaseClient {
  return supabaseAdmin();
}

/** Anonymous server client (RLS applies). */
export function supabaseServerAnon(): SupabaseClient {
  if (!SUPABASE_URL || !ANON_KEY) {
    throw new Error(
      "Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

