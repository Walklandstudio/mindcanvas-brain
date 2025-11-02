import { NextResponse } from 'next/server';
import { getAdminClient, getActiveOrgId } from '@/app/_lib/portal';

type Body = {
  testKey?: string;       // org_tests.slug or org_tests.id
  kind?: 'full' | 'free'; // optional; defaults to 'full'
  maxUses?: number | null;
  expiresAt?: string | null; // ISO
};

// Small helper
function makeToken(prefix = 'tp'): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${Date.now().toString(36)}${rand}`;
}

/**
 * POST /api/portal/links
 * Create a new test link for the active org.
 */
export async function POST(req: Request) {
  try {
    const sb = await getAdminClient();
    const orgId = await getActiveOrgId(sb);
    if (!orgId) return NextResponse.json({ error: 'No active org' }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) as Body;
    const testKey = (body.testKey || '').trim();
    const kind = (body.kind || 'full') as 'full' | 'free';
    const mode = kind; // your table requires `mode` NOT NULL; mirror kind
    const maxUses = Number.isFinite(body.maxUses as any) ? Number(body.maxUses) : 1;
    const expiresAt = body.expiresAt ? new Date(body.expiresAt).toISOString() : null;

    if (!testKey) {
      return NextResponse.json({ error: 'Missing testKey (slug or id)' }, { status: 400 });
    }

    // Resolve test_id (id or slug) scoped to org
    const byId = await sb
      .from('org_tests')
      .select('id,slug')
      .eq('org_id', orgId)
      .eq('id', testKey)
      .maybeSingle();

    let testId: string | null = byId.data?.id ?? null;

    if (!testId) {
      const bySlug = await sb
        .from('org_tests')
        .select('id,slug')
        .eq('org_id', orgId)
        .eq('slug', testKey)
        .maybeSingle();
      testId = bySlug.data?.id ?? null;
    }

    if (!testId) {
      return NextResponse.json(
        { error: `Test not found in org; looked for "${testKey}" (id or slug)` },
        { status: 404 }
      );
    }

    const token = makeToken('tp');

    const ins = await sb
      .from('test_links')
      .insert([
        {
          org_id: orgId,
          test_id: testId,
          token,
          max_uses: maxUses,
          expires_at: expiresAt,
          kind,           // optional column in your schema
          mode,           // REQUIRED by your schema (NOT NULL)
          uses: 0,        // initialize if you keep a uses column
        } as any,
      ])
      .select('id, token')
      .maybeSingle();

    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });

    const appOrigin = process.env.APP_ORIGIN || '';
    const url =
      appOrigin && appOrigin.startsWith('http')
        ? `${appOrigin.replace(/\/+$/, '')}/t/${token}`
        : `/t/${token}`;

    return NextResponse.json({ token, url }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

/**
 * DELETE /api/portal/links
 * Body: { id?: string, token?: string }
 * Deletes a link owned by the active org.
 */
export async function DELETE(req: Request) {
  try {
    const sb = await getAdminClient();
    const orgId = await getActiveOrgId(sb);
    if (!orgId) return NextResponse.json({ error: 'No active org' }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) as { id?: string; token?: string };
    const id = (body.id || '').trim();
    const token = (body.token || '').trim();

    if (!id && !token) {
      return NextResponse.json({ error: 'Provide id or token' }, { status: 400 });
    }

    // Scope by org for safety
    const q = sb.from('test_links').delete();
    if (id) q.eq('id', id);
    if (token) q.eq('token', token);
    q.eq('org_id', orgId);

    const { error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

