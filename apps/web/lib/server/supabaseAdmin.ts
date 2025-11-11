// apps/web/lib/server/supabaseAdmin.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/supabase';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Server-side Supabase client using the service-role key.
 * IMPORTANT: Use the 'portal' schema by default so we can write .from('orgs'), .from('test_takers'), etc.
 */
export const supabaseAdmin = createSupabaseClient(
  SUPABASE_URL,
  SERVICE_ROLE,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'portal' },
  }
);

// Back-compat alias
export const sbAdmin = supabaseAdmin;

// Older code paths sometimes call createClient()
export function createClient() {
  return supabaseAdmin;
}
