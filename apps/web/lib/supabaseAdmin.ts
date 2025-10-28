import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE!;

export const sbAdmin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: 'portal' },         // 👈 default all queries to the `portal` schema
});
