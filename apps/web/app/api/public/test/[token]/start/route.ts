// apps/web/app/api/public/test/[token]/start/route.ts
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/app/_lib/portal';

// Don't type the 2nd arg strictly — use `any`
type StartBody = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  teamName?: string;
  teamFunction?: string;
};

export async function POST(req: Request, ctx: any) {
  try {
    const token = String(ctx?.params?.token || '').trim();
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 });
    }

    const sb = await getAdminClient();

    // 1) Load link -> org_id, test_id, guards
    const linkRes = await sb
      .from('test_links')
      .select('id, org_id, test_id, max_uses, uses, expires_at, kind')
      .eq('token', token)
      .maybeSingle();

    if (linkRes.error) throw linkRes.error;
    const link = linkRes.data;
    if (!link) {
      return NextResponse.json({ ok: false, error: 'invalid or expired link' }, { status: 400 });
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ ok: false, error: 'link expired' }, { status: 400 });
    }
    if (
      typeof link.max_uses === 'number' &&
      typeof link.uses === 'number' &&
      link.uses >= link.max_uses
    ) {
      return NextResponse.json({ ok: false, error: 'link max uses reached' }, { status: 400 });
    }

    // 2) Body
    const body = (await req.json().catch(() => ({}))) as StartBody;

    // 3) Insert taker — only columns that exist in your table
    const insertPayload: Record<string, any> = {
      org_id: link.org_id,
      test_id: link.test_id,
      token, // your schema requires not-null token
    };

    if (body.email) insertPayload.email = body.email;
    if (body.firstName) insertPayload.first_name = body.firstName;
    if (body.lastName) insertPayload.last_name = body.lastName;
    if (body.phone) insertPayload.phone = body.phone;
    if (body.company) insertPayload.company = body.company;
    if (body.teamName) insertPayload.team_name = body.teamName;
    if (body.teamFunction) insertPayload.team_function = body.teamFunction;

    const takerRes = await sb.from('test_takers').insert([insertPayload]).select('id').maybeSingle();
    if (takerRes.error) throw takerRes.error;
    const takerId = takerRes.data?.id as string | undefined;
    if (!takerId) {
      return NextResponse.json({ ok: false, error: 'failed to create taker' }, { status: 500 });
    }

    // 4) Increment uses (best-effort)
    await sb.from('test_links').update({ uses: (link.uses ?? 0) + 1 }).eq('id', link.id);

    return NextResponse.json({ ok: true, takerId }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
