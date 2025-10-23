// apps/web/app/api/public/test/[token]/start/route.ts
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/app/_lib/portal';

export const dynamic = 'force-dynamic';

type StartBody = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  teamName?: string;
  teamFunction?: string;
};

function tooManyUses(max: number | null, used: number | null | undefined) {
  if (max == null) return false;
  return (used ?? 0) >= max;
}

export async function POST(req: Request, ctx: { params: { token: string } }) {
  try {
    const token = ctx?.params?.token;
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    const sb = await getAdminClient();

    // IMPORTANT: select `uses` (your schema), not `uses_count`
    const { data: link, error: linkErr } = await sb
      .from('test_links')
      .select('id, org_id, test_id, max_uses, uses, expires_at, kind, mode')
      .eq('token', token)
      .maybeSingle();

    if (linkErr || !link) return NextResponse.json({ error: 'invalid or expired link' }, { status: 404 });
    if (!link.test_id) return NextResponse.json({ error: 'Link has no test_id' }, { status: 400 });
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link expired' }, { status: 410 });
    }
    if (tooManyUses(link.max_uses as any, (link as any).uses)) {
      return NextResponse.json({ error: 'Link already used' }, { status: 409 });
    }

    const body = (await req.json().catch(() => ({}))) as StartBody;

    // Insert taker WITH test_id
    const ins = await sb
      .from('test_takers')
      .insert([
        {
          org_id: link.org_id,
          test_id: link.test_id,   // ← critical field
          link_id: link.id,
          email: body.email ?? null,
          first_name: body.firstName ?? null,
          last_name: body.lastName ?? null,
          phone: body.phone ?? null,
          role: body.role ?? null,
          team_name: body.teamName ?? null,
          team_function: body.teamFunction ?? null,
          source: 'link',
        } as any,
      ])
      .select('id')
      .maybeSingle();

    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
    const takerId = ins.data?.id as string | undefined;
    if (!takerId) return NextResponse.json({ error: 'Failed to create taker' }, { status: 500 });

    // Bump `uses` now (or do it on completion)
    await sb
      .from('test_links')
      .update({ uses: ((link as any).uses ?? 0) + 1 })
      .eq('id', link.id);

    return NextResponse.json({ ok: true, takerId });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
