// apps/web/app/_lib/org-active.ts
import 'server-only';
import { cookies } from 'next/headers';

const COOKIE = 'active_org_id';

/** Read the current "view as" organization id from the cookie. */
export async function readActiveOrgIdFromCookie(): Promise<string | null> {
  const jar = await cookies(); // Next 15 may type this as async
  const v = jar.get(COOKIE)?.value;
  return v || null;
}

/** Tuple for cookies().set(...) to set the active org cookie. */
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

/** Tuple for cookies().set(...) to clear the cookie. */
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
