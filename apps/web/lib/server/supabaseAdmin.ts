// apps/web/lib/server/supabaseAdmin.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// If you have generated DB types, you can import them and do:
// import type { Database } from '@/types/supabase'; 
// and then: createSupabaseClient<Database>(...)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Server-side Supabase client using the service-role key.
 * Never import this into client components.
 */
export const supabaseAdmin = createSupabaseClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Backwards-compat alias (some files expect this name) */
export const sbAdmin = supabaseAdmin;

/** Convenience factory to match older code paths */
export function createClient() {
  return supabaseAdmin;
}

