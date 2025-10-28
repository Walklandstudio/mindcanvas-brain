// apps/web/lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key  = process.env.SUPABASE_SERVICE_ROLE!; // service role

export const sbAdmin = createClient(url, key, {
  auth: { persistSession: false },
});
