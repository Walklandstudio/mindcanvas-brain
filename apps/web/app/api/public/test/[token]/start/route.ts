// apps/web/app/api/public/test/[token]/start/route.ts
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/app/_lib/portal';

type StartBody = {
  email?: string;
  firstName?: string;
  lastName?: string;
};

export async function POST(req: Request, ctx: any) {
  try {
    const token = String(ctx?.params?.token || '').trim();
    if (!token) return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 });

    const sb = await getAdminClient();

    // 1) Resolve link (org_id, test_id) and basic guards
    const { data: link, error: linkErr } = await sb
      .from('test_links')
      .select('id, org_id, test_id, token, max_uses, uses, expires_at')
      .eq('token', token)
      .maybeSingle();
    if (linkErr) throw linkErr;
    if (!link) return NextResponse.json({ ok: false, error: `invalid or expired link: ${token}` }, { status: 404 });

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ ok: false, error: 'link expired' }, { status: 410 });
    }

    // 2) Idempotency: if taker already exists for (org_id, test_id, token) reuse it
    const existing = await sb
      .from('test_takers')
      .select('id')
      .eq('org_id', link.org_id)
      .eq('test_id', link.test_id)
      .eq('token', token)
      .maybeSingle();

    if (existing.data?.id) {
      // do NOT increment uses on duplicate click
      return NextResponse.json({ ok: true, takerId: existing.data.id, reused: true }, { status: 200 });
    }

    // 3) Enforce max_uses only when creating the first taker for this token
    if (
      typeof link.max_uses === 'number' &&
      typeof link.uses === 'number' &&
      link.uses >= link.max_uses
    ) {
      return NextResponse.json({ ok: false, error: 'link max uses reached' }, { status: 409 });
    }

    // 4) Insert new taker (keep fields minimal and real)
    const body = (await req.json().catch(() => ({}))) as StartBody;
    const email = body.email?.trim().toLowerCase();

    const insert: Record<string, any> = {
      org_id: link.org_id,
      test_id: link.test_id,
      token, // required in your schema
    };
    if (email) insert.email = email;
    if (body.firstName) insert.first_name = body.firstName;
    if (body.lastName) insert.last_name = body.lastName;

    const ins = await sb.from('test_takers').insert([insert]).select('id').maybeSingle();
    if (ins.error) {
      // If you still have a legacy unique (org,email), this gives a clear 409 instead of 500
      if (String(ins.error.message).toLowerCase().includes('duplicate key')) {
        return NextResponse.json({ ok: false, error: ins.error.message }, { status: 409 });
      }
      throw ins.error;
    }

    // 5) Increment uses ONLY on first successful insert
    await sb.from('test_links').update({ uses: (link.uses ?? 0) + 1 }).eq('id', link.id);

    return NextResponse.json({ ok: true, takerId: ins.data?.id, reused: false }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
