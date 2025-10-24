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
    if (!token) return NextResponse.json({ ok:false, error:'Missing token' }, { status:400 });

    const sb = await getAdminClient();

    // 1) Load link (org_id, test_id, guards)
    const { data: link, error: linkErr } = await sb
      .from('test_links')
      .select('id, org_id, test_id, token, max_uses, uses, expires_at')
      .eq('token', token)
      .maybeSingle();
    if (linkErr) throw linkErr;
    if (!link) return NextResponse.json({ ok:false, error:`invalid or expired link: ${token}` }, { status:404 });

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ ok:false, error:'link expired' }, { status:410 });
    }

    const body = (await req.json().catch(() => ({}))) as StartBody;
    const email = body.email?.trim().toLowerCase();

    // 2) Idempotency: if we already have a taker for (org_id, test_id, token) reuse it.
    //    NOTE: Your schema stores taker.token = link.token (per previous steps).
    const existing = await sb
      .from('test_takers')
      .select('id')
      .eq('org_id', link.org_id)
      .eq('test_id', link.test_id)
      .eq('token', token)
      .maybeSingle();

    if (existing.data?.id) {
      // Don't increment uses again on a duplicate click
      return NextResponse.json({ ok:true, takerId: existing.data.id, reused: true }, { status: 200 });
    }

    // 3) Enforce max_uses only when there is no prior taker for this token/test
    if (
      typeof link.max_uses === 'number' &&
      typeof link.uses === 'number' &&
      link.uses >= link.max_uses
    ) {
      return NextResponse.json({ ok:false, error:'link max uses reached' }, { status:409 });
    }

    // 4) Insert new taker (only columns you actually have)
    const insPayload: Record<string, any> = {
      org_id: link.org_id,
      test_id: link.test_id,
      token, // required in your schema
    };
    if (email) insPayload.email = email;
    if (body.firstName) insPayload.first_name = body.firstName;
    if (body.lastName) insPayload.last_name = body.lastName;

    const ins = await sb.from('test_takers').insert([insPayload]).select('id').maybeSingle();
    if (ins.error) {
      // If a uniqueness issue happens (e.g., org/test/email), fetch & reuse
      if (String(ins.error.message).toLowerCase().includes('duplicate key')) {
        const fallback = await sb
          .from('test_takers')
          .select('id')
          .eq('org_id', link.org_id)
          .eq('test_id', link.test_id)
          .eq('token', token)
          .maybeSingle();

        if (fallback.data?.id) {
          return NextResponse.json({ ok:true, takerId: fallback.data.id, reused: true }, { status: 200 });
        }
        return NextResponse.json({ ok:false, error: ins.error.message }, { status: 409 });
      }
      throw ins.error;
    }

    // 5) Increment uses ONLY on first successful insert
    await sb.from('test_links').update({ uses: (link.uses ?? 0) + 1 }).eq('id', link.id);

    return NextResponse.json({ ok:true, takerId: ins.data?.id, reused: false }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok:false, error: String(e?.message || e) }, { status: 500 });
  }
}
