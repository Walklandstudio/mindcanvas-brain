// apps/web/lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

export const sbAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!,
  {
    auth: { persistSession: false },
    // IMPORTANT: do NOT set db.schema here.
    // We'll fully-qualify in queries when needed (e.g., 'portal.tests').
    // db: { schema: 'public' } // optional, but leaving it unset is simplest.
  }
);
