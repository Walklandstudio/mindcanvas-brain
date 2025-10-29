// Server-only Supabase client (singleton).
// Works in Node runtime and avoids "supabaseUrl is required" crashes.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient {
  if (_client) return _client;

  // Prefer NEXT_PUBLIC_* if that’s what you already use elsewhere; fall back to server names.
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  // For server routes that read/write, service role is safest. Falls back to anon.
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  }
  if (!key) {
    throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  _client = createClient(url, key, {
    auth: { persistSession: false },
    global: { headers: { 'x-mc-role': 'server' } },
  });
  return _client;
}
