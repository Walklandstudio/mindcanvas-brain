import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getSupabaseEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return { url, key };
}
const { url, key } = getSupabaseEnv();

export function supabaseServer(): SupabaseClient {
  return createClient(url, key, { auth: { persistSession: false } });
}
export const supabase = supabaseServer();
export default supabaseServer;
