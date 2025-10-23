import { NextResponse } from 'next/server';
import { getAdminClient } from '@/app/_lib/portal';

export const dynamic = 'force-dynamic';

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

type StartBody = { firstName?: string; lastName?: string; email?: string; };

const tooMany = (max: number | null, used?: number | null) =>
  max != null && (used ?? 0) >= max;

function makeTakerToken(prefix = 'tt'): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${Date.now().toString(36)}${rand}`;
}

export async function POST(req: Request, ctx: any) {
  try {
    const token = ctx?.params?.token as string | undefined;
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    const sb = await getAdminClient();

    // 1) Load link
    const { data: link, error: linkErr } = await sb
      .from('test_links')
      .select('id, org_id, test_id, max_uses, uses, expires_at, kind, mode, token')
      .eq('token', token)
      .maybeSingle();

    if (linkErr || !link) return NextResponse.json({ error: 'invalid or expired link' }, { status: 404 });
    if (!link.test_id) return NextResponse.json({ error: 'Link has no test_id' }, { status: 400 });

    // 2) Ensure the referenced test actually exists (prevents FK 500s)
    const testCheck = await sb
      .from('org_tests')
      .select('id')
      .eq('id', link.test_id as any)
      .maybeSingle();
    if (!testCheck.data) {
      return NextResponse.json({ error: 'Link points to a missing test' }, { status: 409 });
    }

    // 3) Validate expiry/uses
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link expired' }, { status: 410 });
    }
    if (tooMany(link.max_uses as any, (link as any).uses)) {
      return NextResponse.json({ error: 'Link already used' }, { status: 409 });
    }

    const body = (await req.json().catch(() => ({}))) as StartBody;

    // 4) Create taker (only columns you have)
    const takerToken = makeTakerToken();
    const ins = await sb
      .from('test_takers')
      .insert([
        {
          org_id: link.org_id,
          test_id: link.test_id,  // FK safe because we validated
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

    // 5) Increment uses
    await sb.from('test_links').update({ uses: ((link as any).uses ?? 0) + 1 }).eq('id', link.id);

    return NextResponse.json({ ok: true, takerId: ins.data?.id, takerToken }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
