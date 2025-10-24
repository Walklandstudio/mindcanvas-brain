// apps/web/app/api/public/test/[token]/route.ts
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/app/_lib/portal';

export async function GET(_req: Request, ctx: { params: { token: string } }) {
  try {
    const token = ctx.params.token?.trim();
    if (!token) return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 });

    const sb = await getAdminClient();

    const linkRes = await sb
      .from('test_links')
      .select('id, org_id, test_id, expires_at, max_uses, uses')
      .eq('token', token)
      .maybeSingle();

    if (linkRes.error) throw linkRes.error;
    const link = linkRes.data;
    if (!link) return NextResponse.json({ ok: false, error: 'invalid or expired link' }, { status: 400 });

    // Load the test name/slug to render the page heading
    const testRes = await sb.from('org_tests').select('id,name,slug').eq('id', link.test_id).maybeSingle();
    if (testRes.error) throw testRes.error;

    return NextResponse.json({ ok: true, data: { token, link, test: testRes.data } });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
