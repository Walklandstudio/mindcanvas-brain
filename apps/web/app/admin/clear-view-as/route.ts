// apps/web/app/admin/clear-view-as/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSupabase } from '@/app/_lib/portal';
import { isPlatformAdminEmail } from '@/app/_lib/admin';
import { makeClearActiveOrgCookie } from '@/app/_lib/org-active';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const sbUser = await getServerSupabase();
  const { data: { user } } = await sbUser.auth.getUser();
  const email = user?.email ?? null;

  if (!isPlatformAdminEmail(email)) {
    return NextResponse.redirect(new URL('/admin', req.url));
  }

  const jar = await cookies();
  const [name, value, opts] = makeClearActiveOrgCookie();
  try { jar.set({ name, value, ...(opts as any) }); } catch {}

  return NextResponse.redirect(new URL('/admin', req.url));
}
