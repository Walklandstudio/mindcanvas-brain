// apps/web/app/_lib/org-active.ts
import 'server-only';
import { cookies } from 'next/headers';

const COOKIE = 'active_org_id';

/**
 * Read the current "view as" organization id from the cookie.
 * Works in RSC, server actions, and route handlers.
 */
export async function readActiveOrgIdFromCookie(): Promise<string | null> {
  // In Next 15, cookies() may be async-typed in some contexts
  const jar = await cookies();
  const v = jar.get(COOKIE)?.value;
  return v || null;
}

/**
 * Return a tuple you can pass to cookies().set(...) to set the active org cookie.
 * Example:
 *   const [name, value, opts] = makeSetActiveOrgCookie(orgId);
 *   (await cookies()).set(name, value, opts);
 */
export function makeSetActiveOrgCookie(orgId: string) {
  return [
    COOKIE,
    orgId,
    {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 6, // 6 hours
    } as const,
  ] as const;
}

/**
 * Return a tuple you can pass to cookies().set(...) to clear the cookie.
 */
export function makeClearActiveOrgCookie() {
  return [
    COOKIE,
    '',
    {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    } as const,
  ] as const;
}
