import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client for API routes (anon key).
 * Use supabaseAdmin for privileged actions.
 */
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export default supabaseServer;
