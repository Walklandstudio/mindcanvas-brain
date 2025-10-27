import { createClient } from '@supabase/supabase-js';

export const sbAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!,
  {
    auth: { persistSession: false },
    db: { schema: 'portal' }, // 👈 tell Supabase to use the 'portal' schema by default
  }
);
