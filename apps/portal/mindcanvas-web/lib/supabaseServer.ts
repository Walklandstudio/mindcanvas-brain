// mindcanvas-web/lib/supabaseServer.ts
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function supabaseServer(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase env vars");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}
