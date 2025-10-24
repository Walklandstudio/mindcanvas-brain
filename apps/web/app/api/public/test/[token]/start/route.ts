import { NextResponse } from 'next/server';
import { getAdminClient } from '@/app/_lib/portal';

// Keep body minimal; add fields only if columns exist in your table
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

    // 1) Resolve link
    const { data: link, error: linkErr } = await sb
      .from('test_links')
      .select('id, org_id, test_id, token, max_uses, uses, expires_at')
      .eq('token', token)
      .maybeSingle();
    if (linkErr) throw linkErr;
    if (!link) return NextResponse.json({ ok:false, error:`invalid or expired link: ${token}` }, { status:404 });

    // Guards
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ ok:false, error:'link expired' }, { status:410 });
    }
    if (typeof link.max_uses === 'number' && typeof link.uses === 'number' && link.uses >= link.max_uses) {
      return NextResponse.json({ ok:false, error:'link max uses reached' }, { status:409 });
    }

    // 2) Parse body
    const body = (await req.json().catch(() => ({}))) as StartBody;
    const email = body.email?.trim().toLowerCase();

    // 3) If email provided, reuse existing taker for SAME test (idempotent)
    if (email) {
      const existing = await sb
        .from('test_takers')
        .select('id')
        .eq('org_id', link.org_id)
        .eq('test_id', link.test_id)    // important: scope to this test
        .eq('email', email)
        .limit(1)
        .maybeSingle();

      if (existing.data?.id) {
        // Best-effort: bump uses
        await sb.from('test_links').update({ uses: (link.uses ?? 0) + 1 }).eq('id', link.id);
        return NextResponse.json({ ok:true, takerId: existing.data.id, reused: true }, { status: 200 });
      }
    }

    // 4) Insert new taker
    const insPayload: Record<string, any> = {
      org_id: link.org_id,
      test_id: link.test_id,
      token, // your schema requires this (per earlier errors)
    };
    if (email) insPayload.email = email;
    if (body.firstName) insPayload.first_name = body.firstName;
    if (body.lastName) insPayload.last_name = body.lastName;

    const ins = await sb.from('test_takers').insert([insPayload]).select('id').maybeSingle();

    // If we still have a uniqueness issue (e.g., index wasn’t migrated), try to fetch & reuse
    if (ins.error && String(ins.error.message).toLowerCase().includes('duplicate key')) {
      if (email) {
        const fallback = await sb
          .from('test_takers')
          .select('id')
          .eq('org_id', link.org_id)
          .eq('test_id', link.test_id)
          .eq('email', email)
          .limit(1)
          .maybeSingle();

        if (fallback.data?.id) {
          await sb.from('test_links').update({ uses: (link.uses ?? 0) + 1 }).eq('id', link.id);
          return NextResponse.json({ ok:true, takerId: fallback.data.id, reused: true }, { status: 200 });
        }
      }
      // Otherwise surface the DB message
      return NextResponse.json({ ok:false, error: ins.error.message }, { status: 409 });
    }
    if (ins.error) throw ins.error;

    await sb.from('test_links').update({ uses: (link.uses ?? 0) + 1 }).eq('id', link.id);

    return NextResponse.json({ ok:true, takerId: ins.data?.id, reused: false }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok:false, error: String(e?.message || e) }, { status: 500 });
  }
}
