import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type KV = { key: string; value: number };
type Payload = {
  frequencies: KV[];
  profiles: KV[];
  top3: KV[];
  bottom3: KV[];
  overall?: { average?: number; count?: number };
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orgSlug = url.searchParams.get('org')?.trim();
  const testId = url.searchParams.get('testId')?.trim() || null;

  if (!orgSlug) {
    return NextResponse.json({ ok: false, error: 'Missing ?org=slug' }, { status: 400 });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, error: 'Server misconfigured: missing Supabase env' }, { status: 500 });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // 1) Confirm org exists — THIS DB USES portal.orgs
  const { data: orgRows, error: orgErr } = await sb
    .from('portal.orgs')
    .select('id, slug')
    .eq('slug', orgSlug)
    .limit(1);

  if (orgErr) {
    return NextResponse.json({ ok: false, error: `Org lookup failed: ${orgErr.message}` }, { status: 500 });
  }
  if (!orgRows?.length) {
    return NextResponse.json({ ok: false, error: 'Org not found' }, { status: 404 });
  }

  // 2) Primary path: call your RPC if present
  const { data: rpcData, error: rpcErr } = await sb.rpc('fn_get_dashboard_data', {
    p_org_slug: orgSlug,
    p_test_id: testId,
  });

  if (rpcErr && (rpcErr as any).code !== '42883') {
    // 42883 = undefined_function (RPC not found). For other errors, surface them.
    return NextResponse.json(
      { ok: false, error: `RPC error: ${rpcErr.message}`, code: (rpcErr as any).code ?? null },
      { status: 500 }
    );
  }

  if (rpcData) {
    return NextResponse.json({ ok: true, org: orgSlug, testId, data: rpcData as Payload }, { status: 200 });
  }

  // 3) Fallback if RPC not installed: try consolidated view(s)
  // We’ll attempt a few likely view shapes without exploding your build.
  // If none match, we return a helpful message.
  try {
    // Try a consolidated view keyed by org slug or id
    // Adjust these if your view uses different column names.
    const { data: viewData, error: viewErr } = await sb
      .from('portal.v_dashboard_consolidated')
      .select('*')
      .or(`org_slug.eq.${orgSlug},slug.eq.${orgSlug}`) // if the view exposes slug
      .limit(1);

    if (!viewErr && viewData && viewData.length) {
      // Expect the view to already be shaped similarly to Payload; if not, map here.
      return NextResponse.json(
        { ok: true, org: orgSlug, testId, data: viewData[0] as unknown as Payload },
        { status: 200 }
      );
    }
  } catch (_) {
    // swallow and continue to final message
  }

  return NextResponse.json(
    {
      ok: false,
      error:
        'Dashboard data source not found. Either install RPC portal.fn_get_dashboard_data or ensure portal.v_dashboard_consolidated exposes data for this org.',
    },
    { status: 501 }
  );
}
