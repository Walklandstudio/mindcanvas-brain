// apps/web/app/api/public/test/[token]/route.ts
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/app/_lib/portal';

export async function GET(_req: Request, ctx: any) {
  try {
    const token = String(ctx?.params?.token || '').trim();
    if (!token) return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 });

    const sb = await getAdminClient();

    const linkRes = await sb
      .from('test_links')
      .select('id, org_id, test_id, token, expires_at, max_uses, uses, kind')
      .eq('token', token)
      .maybeSingle();
    if (linkRes.error) throw linkRes.error;

    const link = linkRes.data;
    if (!link) return NextResponse.json({ ok: false, error: 'invalid or expired link' }, { status: 404 });

    // Load test title for UX
    const testRes = await sb.from('org_tests').select('id,slug,name,status').eq('id', link.test_id).maybeSingle();

    return NextResponse.json({ ok: true, token, link, test: testRes.data ?? null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
