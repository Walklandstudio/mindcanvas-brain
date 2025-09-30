import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Fail loudly at build time if either is missing
if (!url) throw new Error('Missing env NEXT_PUBLIC_SUPABASE_URL');
if (!serviceRoleKey) throw new Error('Missing env SUPABASE_SERVICE_ROLE_KEY');

// IMPORTANT: use the service-role key here, not the anon key
export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
