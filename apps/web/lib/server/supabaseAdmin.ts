// apps/web/lib/server/supabaseAdmin.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Server-side client pinned to the 'portal' schema */
export const supabaseAdmin = createSupabaseClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'portal' },
});

// Back-compat
export const sbAdmin = supabaseAdmin;
export function createClient() { return supabaseAdmin; }
