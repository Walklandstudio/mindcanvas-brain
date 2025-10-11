// apps/web/app/_lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE!;

export function getServiceClient() {
  // Server-side only usage (Admin/service role)
  return createClient(URL, SERVICE, { auth: { persistSession: false } });
}

export function getAnonClient() {
  // Client/browser usage (Anon)
  return createClient(URL, ANON, { auth: { persistSession: true } });
}
