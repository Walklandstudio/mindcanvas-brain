// apps/web/app/_lib/supabase/server.ts
import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createCoreClient } from '@supabase/supabase-js';

/** Promise-safe cookie wrapper to avoid TS "Promise<ReadonlyRequestCookies>" */
function cookieStore() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store = (cookies as unknown as () => any)();
  return store as {
    get: (name: string) => { value: string } | undefined;
    set: (args: { name: string; value: string } & CookieOptions) => void;
  };
}

/**
 * Authenticated client (reads/writes as the signed-in user).
 * Uses Next cookies for session — safe for Server Components, server actions, and API routes.
 */
export function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          try { return cookieStore().get(name)?.value; } catch { return undefined; }
        },
        set(name: string, value: string, options: CookieOptions) {
          try { cookieStore().set({ name, value, ...options }); } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore().set({ name, value: '', ...options }); } catch {}
        },
      },
    }
  );
}

/**
 * Service-role client for trusted server code (no cookies, bypasses RLS).
 * ONLY call this from server-only contexts (API route, server action).
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE!;
  return createCoreClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'mindcanvas-admin' } },
  });
}
