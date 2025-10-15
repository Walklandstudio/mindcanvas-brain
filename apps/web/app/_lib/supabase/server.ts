// Simple, stable server-side Supabase clients (no @supabase/ssr, no cookies()).

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE!;

if (!url || !anon) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export function supabaseAnon() {
  return createClient<Database>(url, anon, { auth: { persistSession: false } });
}

export function supabaseAdmin() {
  if (!serviceRole) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE for server-side writes");
  }
  return createClient<Database>(url, serviceRole, { auth: { persistSession: false } });
}
