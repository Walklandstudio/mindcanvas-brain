// apps/web/app/api/public/test/[token]/route.ts
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/app/_lib/portal';

export const dynamic = 'force-dynamic';

// GET /api/public/test/:token  -> validate token and return minimal info
export async function GET(_req: Request, context: any) {
  try {
    const token = context?.params?.token as string | undefined;
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    const sb = await getAdminClient();

    const { data: link, error: linkErr } = await sb
      .from('test_links')
      .select('id, token, org_id, test_id, max_uses, uses, expires_at, kind, mode')
      .eq('token', token)
      .maybeSingle();

    if (linkErr || !link) return NextResponse.json({ error: 'invalid or expired link' }, { status: 404 });
    if (!link.test_id) return NextResponse.json({ error: 'Link has no test_id' }, { status: 400 });
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link expired' }, { status: 410 });
    }
    if (link.max_uses != null && (link.uses ?? 0) >= link.max_uses) {
      return NextResponse.json({ error: 'Link already used' }, { status: 409 });
    }

    const [{ data: test }, { data: org }] = await Promise.all([
      sb.from('org_tests').select('id, name, slug, status, mode').eq('id', link.test_id).maybeSingle(),
      sb.from('organizations').select('id, name, slug').eq('id', link.org_id).maybeSingle(),
    ]);

    return NextResponse.json({
      ok: true,
      link: {
        token: link.token,
        maxUses: link.max_uses,
        uses: link.uses ?? 0,
        expiresAt: link.expires_at,
        kind: link.kind,
        mode: link.mode,
      },
      test: test ? { id: test.id, name: test.name, slug: test.slug, status: test.status, mode: test.mode } : null,
      org: org ? { id: org.id, name: org.name, slug: org.slug } : null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
