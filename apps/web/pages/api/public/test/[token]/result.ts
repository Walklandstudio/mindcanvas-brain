import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

type Totals = Record<string, number>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.query.token as string | undefined;
  if (!token) return res.status(200).json({ ok: false, stage: 'init', error: 'missing_token' });

  const db = sbAdmin.schema('portal'); // ✅ bind schema once

  try {
    const link = await db.from('test_links')
      .select('test_id, token')
      .eq('token', token)
      .maybeSingle();

    if (link.error) return res.status(200).json({ ok: false, stage: 'link_lookup', error: link.error.message });
    if (!link.data) return res.status(200).json({ ok: false, stage: 'link_lookup', error: 'link_not_found' });

    const taker = await db.from('test_takers')
      .select('id, first_name, last_name, email, status')
      .eq('link_token', token)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (taker.error) return res.status(200).json({ ok: false, stage: 'taker_lookup', error: taker.error.message });
    if (!taker.data) return res.status(200).json({ ok: false, stage: 'taker_lookup', error: 'taker_not_found' });

    let totals: Totals = {};
    const sub = await db.from('test_submissions')
      .select('totals')
      .eq('taker_id', taker.data.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub.error && sub.data?.totals) totals = sub.data.totals as Totals;

    return res.status(200).json({ ok: true, taker: taker.data, totals });
  } catch (e: any) {
    return res.status(200).json({ ok: false, stage: 'catch', error: e?.message || 'internal_error' });
  }
}
