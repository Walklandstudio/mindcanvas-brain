// apps/web/app/_lib/supabase/server.ts
import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Typed, Promise-safe cookie store wrapper.
 * In some Next/TS combos, cookies() is typed as a Promise — we normalise it here.
 */
function cookieStore() {
  // Cast once to avoid "Promise<ReadonlyRequestCookies>" errors.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store = (cookies as unknown as () => any)();
  return store as {
    get: (name: string) => { value: string } | undefined;
    set: (args: { name: string; value: string } & CookieOptions) => void;
  };
}

export function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          try {
            return cookieStore().get(name)?.value;
          } catch {
            return undefined;
          }
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore().set({ name, value, ...options });
          } catch {
            // ignore in dev/edge where set() may be restricted
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore().set({ name, value: '', ...options });
          } catch {}
        },
      },
    }
  );
}
