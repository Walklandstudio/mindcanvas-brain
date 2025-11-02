import { NextResponse } from 'next/server';
import { getAdminClient, getActiveOrgId } from '@/app/_lib/portal';

export const runtime = 'nodejs';

function makeToken(prefix = 'tp') {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${Date.now().toString(36)}${rand}`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { testKey, email, kind = 'full', maxUses = 1 } = body || {};
  if (!testKey || !email) {
    return NextResponse.json({ error: 'Missing testKey or email' }, { status: 400 });
  }

  const sb = await getAdminClient(); // should already be scoped to portal schema in your helper
  const orgId = await getActiveOrgId(sb);
  if (!orgId) return NextResponse.json({ error: 'No active org' }, { status: 400 });

  // Resolve test (id or slug) scoped to org
  const byId = await sb.from('org_tests').select('id').eq('org_id', orgId).eq('id', testKey).maybeSingle();
  let testId: string | null = byId.data?.id ?? null;

  if (!testId) {
    const bySlug = await sb.from('org_tests').select('id').eq('org_id', orgId).eq('slug', testKey).maybeSingle();
    testId = bySlug.data?.id ?? null;
  }
  if (!testId) return NextResponse.json({ error: 'Test not found in org' }, { status: 404 });

  const token = makeToken('tp');

  // Your portal.test_links has: id, test_id, token, max_uses, use_count, created_at, org_id (+ optional kind/mode if present)
  const ins = await sb
    .from('test_links')
    .insert([{ org_id: orgId, test_id: testId, token, max_uses: Number(maxUses), kind } as any])
    .select('token')
    .maybeSingle();

  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });

  const rawOrigin = (process.env.APP_ORIGIN || '').replace(/\/+$/, '');
  const base = rawOrigin && /^https?:\/\//i.test(rawOrigin) ? rawOrigin : '';
  const url = `${base}/t/${token}`;

  // No email send here; frontend can display the URL
  return NextResponse.json({ url }, { status: 201 });
}
