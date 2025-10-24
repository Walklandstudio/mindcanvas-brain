// apps/web/app/api/tests/by-id/[id]/link/route.ts
import { NextResponse } from 'next/server';
import { getAdminClient, getActiveOrgId } from '@/app/_lib/portal';

type Params = { id: string };

function makeToken(prefix = 'tp'): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${Date.now().toString(36)}${rand}`;
}

async function createLinkForTestId(testId: string, opts?: { maxUses?: number; kind?: 'full' | 'free'; expiresAt?: string | null; }) {
  const sb = await getAdminClient();
  const orgId = await getActiveOrgId(sb);
  if (!orgId) return { status: 400, body: { ok: false, error: 'No active org (set it from /admin).' } };

  // Ensure the test belongs to this org
  const testRes = await sb
    .from('org_tests')
    .select('id, slug')
    .eq('id', testId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (testRes.error) return { status: 500, body: { ok: false, error: testRes.error.message } };
  if (!testRes.data?.id) return { status: 404, body: { ok: false, error: `Test not found in this org: ${testId}` } };

  const token = makeToken('tp');
  const kind = (opts?.kind ?? 'full') as 'full' | 'free';
  const max_uses = Number.isFinite(opts?.maxUses) ? Number(opts!.maxUses) : 1;
  const expires_at = opts?.expiresAt ? new Date(opts.expiresAt!).toISOString() : null;

  const ins = await sb
    .from('test_links')
    .insert([{ org_id: orgId, test_id: testId, token, kind, max_uses, expires_at }])
    .select('id, token')
    .maybeSingle();

  if (ins.error) return { status: 500, body: { ok: false, error: ins.error.message } };

  const appOrigin = process.env.APP_ORIGIN || '';
  const url =
    appOrigin && appOrigin.startsWith('http')
      ? `${appOrigin.replace(/\/+$/, '')}/t/${token}`
      : `/t/${token}`;

  return { status: 201, body: { ok: true, token, url, testId } };
}

export async function POST(req: Request, ctx: { params: Promise<Params> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const res = await createLinkForTestId(id, {
      maxUses: body?.maxUses,
      kind: body?.kind,
      expiresAt: body?.expiresAt ?? null,
    });
    return NextResponse.json(res.body, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

// Convenience: allow GET to create the link too.
// If you pass ?redirect=1 we'll redirect straight to /t/{token}.
export async function GET(req: Request, ctx: { params: Promise<Params> }) {
  try {
    const { id } = await ctx.params;
    const url = new URL(req.url);
    const maxUses = url.searchParams.get('maxUses');
    const kind = (url.searchParams.get('kind') as 'full' | 'free') || undefined;
    const expiresAt = url.searchParams.get('expiresAt');
    const shouldRedirect = url.searchParams.get('redirect');

    const maxUsesNum = maxUses ? Number(maxUses) : undefined;
    const res = await createLinkForTestId(id, { maxUses: maxUsesNum, kind, expiresAt });

    // Redirect flow
    if (shouldRedirect && res.status < 400 && (res.body as any)?.url) {
      return NextResponse.redirect((res.body as any).url, { status: 303 });
    }

    return NextResponse.json(res.body, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
