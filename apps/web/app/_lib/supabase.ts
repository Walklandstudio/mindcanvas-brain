// apps/web/app/_lib/supabase.ts
import { supabase } from "@/app/_lib/supabase";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser-safe supabase client (no service role here)
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});
