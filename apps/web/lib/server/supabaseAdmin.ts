// apps/web/lib/server/supabaseAdmin.ts
// Backward-compatible Supabase admin helper.
// Exposes: `supabaseAdmin` (preferred), `sbAdmin` (legacy alias), and `createClient` (legacy factory).

import { createClient as _createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !serviceKey) {
  throw new Error('Missing SUPABASE env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

/**
 * Legacy-compatible factory used by older code that expects to call `createClient()`
 * from this module (instead of from '@supabase/supabase-js').
 */
export function createClient(): SupabaseClient {
  return _createClient(url, serviceKey, { auth: { persistSession: false } });
}

/** Preferred singleton for server-side admin operations (service-role). */
export const supabaseAdmin: SupabaseClient = createClient();

/** Legacy alias some routes import: `import { sbAdmin } from "@/lib/server/supabaseAdmin"` */
export const sbAdmin: SupabaseClient = supabaseAdmin;

// Optional: also re-export the original named import in case any code grabs it
export { _createClient as createSupabaseClientLib };
