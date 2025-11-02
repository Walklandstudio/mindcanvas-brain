// apps/web/app/admin/view-as/[org]/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSupabase, getAdminClient } from '@/app/_lib/portal';
import { isPlatformAdminEmail } from '@/app/_lib/admin';
import { makeSetActiveOrgCookie } from '@/app/_lib/org-active';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  // URL: /admin/view-as/{orgId}
  const { pathname } = new URL(req.url);
  // ["", "admin", "view-as", "{orgId}"]
  const parts = pathname.split('/');
  const orgId = (parts[3] || '').trim();

  if (!orgId) {
    return NextResponse.redirect(new URL('/admin', req.url));
  }

  // Verify current user is a platform admin
  const sbUser = await getServerSupabase();
  const { data: { user } } = await sbUser.auth.getUser();
  const email = user?.email ?? null;

  if (!isPlatformAdminEmail(email)) {
    return NextResponse.redirect(new URL('/admin', req.url));
  }

  // Validate org exists (service role)
  const admin = await getAdminClient();
  const { data: org } = await admin
    .from('organizations')
    .select('id')
    .eq('id', orgId)
    .maybeSingle();

  if (!org) {
    return NextResponse.redirect(new URL('/admin', req.url));
  }

  // Set cookie and redirect to portal
  const jar = await cookies();
  const [name, value, opts] = makeSetActiveOrgCookie(orgId);
  try { jar.set({ name, value, ...(opts as any) }); } catch {}

  return NextResponse.redirect(new URL('/portal', req.url));
}
