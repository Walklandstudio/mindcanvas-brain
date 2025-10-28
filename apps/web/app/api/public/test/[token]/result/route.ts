import { sbAdmin } from '@/lib/supabaseAdmin';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!token) return json(200, { ok: false, stage: 'init', error: 'missing_token' });

  try {
    const db = sbAdmin.schema('portal');

    const link = await db.from('test_links')
      .select('test_id')
      .eq('token', token)
      .maybeSingle();
    if (link.error) return json(200, { ok: false, stage: 'link_lookup', error: link.error.message });
    if (!link.data)  return json(200, { ok: false, stage: 'link_lookup', error: 'link_not_found' });

    const taker = await db.from('test_takers')
      .select('id, first_name, last_name, email, status')
      .eq('link_token', token)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (taker.error) return json(200, { ok: false, stage: 'taker_lookup', error: taker.error.message });
    if (!taker.data)  return json(200, { ok: false, stage: 'taker_lookup', error: 'taker_not_found' });

    let totals: Record<string, number> = {};
    const sub = await db.from('test_submissions')
      .select('totals')
      .eq('taker_id', taker.data.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub.error && sub.data?.totals) totals = sub.data.totals as Record<string, number>;

    return json(200, { ok: true, taker: taker.data, totals });
  } catch (e: any) {
    return json(200, { ok: false, stage: 'catch', error: e?.message || 'internal_error' });
  }
}

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
