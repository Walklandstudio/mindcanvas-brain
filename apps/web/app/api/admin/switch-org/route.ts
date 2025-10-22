// apps/web/app/api/admin/switch-org/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSupabase, getAdminClient } from '@/app/_lib/portal';
import { isPlatformAdminEmail } from '@/app/_lib/admin';
import { makeSetActiveOrgCookie, makeClearActiveOrgCookie } from '@/app/_lib/org-active';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const orgId = (body?.orgId || '').trim();

  // Auth (user-scoped)
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  const email = user?.email ?? null;

  if (!isPlatformAdminEmail(email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const jar = await cookies();

  // Clear active org if orgId not provided
  if (!orgId) {
    const [name, value, opts] = makeClearActiveOrgCookie();
    try {
      jar.set({ name, value, ...(opts as any) });
    } catch {
      // ignore if immutable in this context
    }
    return NextResponse.json({ ok: true, cleared: true });
  }

  // Validate org exists (admin client; bypass RLS)
  const admin = await getAdminClient();
  const { data: org, error } = await admin
    .from('organizations')
    .select('id')
    .eq('id', orgId)
    .maybeSingle();

  if (error || !org) {
    return NextResponse.json({ error: 'Org not found' }, { status: 404 });
  }

  // Set active org cookie
  const [name, value, opts] = makeSetActiveOrgCookie(orgId);
  try {
    jar.set({ name, value, ...(opts as any) });
  } catch {
    // ignore if immutable in this context
  }

  return NextResponse.json({ ok: true, orgId });
}
