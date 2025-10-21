// Server-only Supabase client using the service role key.
// Do NOT import this into client components.

import { createClient } from "@supabase/supabase-js";

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
