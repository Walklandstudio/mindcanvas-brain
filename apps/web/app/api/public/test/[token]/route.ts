// apps/web/app/api/public/test/[token]/route.ts
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/app/_lib/portal';

// (Important) Don't add a strict type to the 2nd arg in Next 15 route handlers.
export async function GET(_req: Request, ctx: any) {
  try {
    const token = String(ctx?.params?.token || '').trim();
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 });
    }

    const sb = await getAdminClient();

    // Load the link
    const linkRes = await sb
      .from('test_links')
      .select('id, org_id, test_id, expires_at, max_uses, uses')
      .eq('token', token)
      .maybeSingle();

    if (linkRes.error) throw linkRes.error;
    const link = linkRes.data;
    if (!link) {
      return NextResponse.json({ ok: false, error: 'invalid or expired link' }, { status: 400 });
    }

    // Load the test meta
    const testRes = await sb
      .from('org_tests')
      .select('id, name, slug')
      .eq('id', link.test_id)
      .maybeSingle();

    if (testRes.error) throw testRes.error;

    return NextResponse.json({ ok: true, data: { token, link, test: testRes.data } }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
