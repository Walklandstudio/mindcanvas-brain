import { sbAdmin } from '@/lib/supabaseAdmin';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!token) return json(200, { ok: false, stage: 'init', error: 'missing_token' });

  try {
    const db = sbAdmin.schema('portal');

    const link = await db.from('test_links')
      .select('test_id, org_id, token')
      .eq('token', token)
      .maybeSingle();
    if (link.error) return json(200, { ok: false, stage: 'link_lookup', error: link.error.message });
    if (!link.data)  return json(200, { ok: false, stage: 'link_lookup', error: 'link_not_found' });

    const latest = await db.from('test_takers')
      .select('id')
      .eq('link_token', token)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let takerId = latest.data?.id as string | undefined;
    if (!takerId) {
      const ins = await db.from('test_takers').insert({
        org_id: link.data.org_id,
        test_id: link.data.test_id,
        link_token: token,
        status: 'started',
        first_name: null,
        last_name: null,
        email: null,
      }).select('id').single();
      if (ins.error) return json(200, { ok: false, stage: 'taker_insert', error: ins.error.message });
      takerId = ins.data.id;
    }

    return json(200, { ok: true, taker_id: takerId, test_id: link.data.test_id });
  } catch (e: any) {
    return json(200, { ok: false, stage: 'catch', error: e?.message || 'internal_error' });
  }
}

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
