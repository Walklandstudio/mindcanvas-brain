// apps/web/app/api/public/test/[token]/start/route.ts
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/app/_lib/portal';

export const dynamic = 'force-dynamic';

// CORS preflight so the button doesn't throw 405s
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

type StartBody = { firstName?: string; lastName?: string; email?: string };

const tooMany = (max: number | null, used?: number | null) =>
  max != null && (used ?? 0) >= max;

// If a link points to a missing test, try to resolve a default slug for this org and update it.
async function ensureLinkPointsToExistingTest(sb: any, link: any) {
  // 1) does test_id exist?
  const check = await sb.from('org_tests').select('id, slug').eq('id', link.test_id).maybeSingle();
  if (check.data) return link.test_id as string;

  // 2) self-heal: try to find a reasonable default test in this org
  //    Prefer a test with slug 'team-puzzle-profile' (change if your default differs)
  const fallbackSlug = 'team-puzzle-profile';

  const fallback = await sb
    .from('org_tests')
    .select('id')
    .eq('org_id', link.org_id)
    .eq('slug', fallbackSlug)
    .maybeSingle();

  if (!fallback.data) {
    // As a last resort, see if ANY test exists for this org and use the first one
    const anyTest = await sb
      .from('org_tests')
      .select('id')
      .eq('org_id', link.org_id)
      .limit(1)
      .maybeSingle();

    if (!anyTest.data) {
      throw new Error('Link points to missing test and no fallback test exists for this org.');
    }

    await sb.from('test_links').update({ test_id: anyTest.data.id }).eq('id', link.id);
    return anyTest.data.id as string;
  }

  await sb.from('test_links').update({ test_id: fallback.data.id }).eq('id', link.id);
  return fallback.data.id as string;
}

// NOTE: don't type the 2nd arg in Next 15 route handlers
export async function POST(req: Request, ctx: any) {
  try {
    const token = ctx?.params?.token as string | undefined;
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    const sb = await getAdminClient();

    // load link by token
    const { data: link, error: linkErr } = await sb
      .from('test_links')
      .select('id, org_id, test_id, token, max_uses, uses, expires_at, kind, mode')
      .eq('token', token)
      .maybeSingle();

    if (linkErr || !link) return NextResponse.json({ error: 'invalid or expired link' }, { status: 404 });

    // validate expiry/uses
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link expired' }, { status: 410 });
    }
    if (tooMany(link.max_uses as any, (link as any).uses)) {
      return NextResponse.json({ error: 'Link already used' }, { status: 409 });
    }

    // ensure link.test_id refers to a real org_tests row; self-heal if not
    const resolvedTestId = await ensureLinkPointsToExistingTest(sb, link);

    const body = (await req.json().catch(() => ({}))) as StartBody;

    // your table requires a taker token
    const takerToken = `tt${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

    // insert minimal columns that exist in your schema
    const ins = await sb
      .from('test_takers')
      .insert([
        {
          org_id: link.org_id,
          test_id: resolvedTestId, // valid because we just checked / fixed it
          token: takerToken,
          email: body.email ?? null,
          first_name: body.firstName ?? null,
          last_name: body.lastName ?? null,
        } as any,
      ])
      .select('id')
      .maybeSingle();

    if (ins.error) {
      return NextResponse.json({ error: ins.error.message }, { status: 500 });
    }

    // bump uses
    await sb.from('test_links').update({ uses: ((link as any).uses ?? 0) + 1 }).eq('id', link.id);

    return NextResponse.json({ ok: true, takerId: ins.data?.id, takerToken }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
