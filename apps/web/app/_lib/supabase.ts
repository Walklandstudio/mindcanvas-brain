import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Single exported client. (Name 'supabase' is exported only once to avoid merged-declaration errors.)
export const supabase: SupabaseClient = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});
