// apps/web/app/api/tests/by-id/[id]/link/route.ts
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/app/_lib/portal';

type Params = { id: string };

function makeToken(prefix = 'tp'): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${Date.now().toString(36)}${rand}`;
}

async function createLink(testId: string, opts?: { maxUses?: number; kind?: 'full' | 'free'; expiresAt?: string | null; }) {
  const sb = await getAdminClient();

  // Find the test and its org_id BY ID, not cookie
  const tr = await sb
    .from('org_tests')
    .select('id, org_id, slug')
    .eq('id', testId)
    .maybeSingle();

  if (tr.error) return { status: 500, json: { ok: false, error: tr.error.message } };
  if (!tr.data?.id) return { status: 404, json: { ok: false, error: `Test not found: ${testId}` } };

  const token = makeToken('tp');
  const max_uses = Number.isFinite(opts?.maxUses) ? Number(opts!.maxUses) : 1;
  const kind = (opts?.kind ?? 'full') as 'full' | 'free';
  const expires_at = opts?.expiresAt ? new Date(opts.expiresAt!).toISOString() : null;

  const ins = await sb
    .from('test_links')
    .insert([{ org_id: tr.data.org_id, test_id: tr.data.id, token, max_uses, kind, expires_at }])
    .select('token')
    .maybeSingle();

  if (ins.error) return { status: 500, json: { ok: false, error: ins.error.message } };

  const appOrigin = process.env.APP_ORIGIN || '';
  const url =
    appOrigin && appOrigin.startsWith('http')
      ? `${appOrigin.replace(/\/+$/, '')}/t/${token}`
      : `/t/${token}`;

  return { status: 201, json: { ok: true, token, url } };
}

// Next 15: params is a Promise
export async function GET(req: Request, ctx: { params: Promise<Params> }) {
  try {
    const { id } = await ctx.params;
    const res = await createLink(id, {});
    return NextResponse.json(res.json, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<Params> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const res = await createLink(id, {
      maxUses: body?.maxUses,
      kind: body?.kind,
      expiresAt: body?.expiresAt ?? null,
    });
    return NextResponse.json(res.json, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
