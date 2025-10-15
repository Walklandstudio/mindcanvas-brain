import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Public (browser-safe) client using anon key */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase: SupabaseClient = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Server-only admin client using the service role key (for API routes, actions) */
export function getServiceClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("getServiceClient() can only be used on the server");
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE is missing. Add it to Vercel (Server env).");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
