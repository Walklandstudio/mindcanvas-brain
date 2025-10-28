// apps/web/pages/api/public/test/[token]/result.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

type Totals = Record<string, number>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.query.token as string | undefined;
  if (!token) return res.status(400).json({ ok: false, error: 'missing_token' });

  try {
    const db = sbAdmin.schema('portal');

    // 1) token -> test_id
    const link = await db
      .from('test_links')
      .select('test_id, token')
      .eq('token', token)
      .maybeSingle();

    if (link.error) return res.status(500).json({ ok: false, error: link.error.message });
    if (!link.data) return res.status(404).json({ ok: false, error: 'link_not_found' });

    // 2) taker (latest by token)
    const taker = await db
      .from('test_takers')
      .select('id, first_name, last_name, email, status')
      .eq('link_token', token)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (taker.error) return res.status(500).json({ ok: false, error: taker.error.message });
    if (!taker.data) return res.status(404).json({ ok: false, error: 'taker_not_found' });

    // 3) totals from submissions if table exists (fail-soft)
    let totals: Totals = {};
    try {
      const sub = await db
        .from('test_submissions')
        .select('totals')
        .eq('taker_id', taker.data.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub.error && sub.error.message?.includes('relation') && sub.error.message?.includes('does not exist')) {
        // table missing → ignore
      } else if (sub.error) {
        return res.status(500).json({ ok: false, error: sub.error.message });
      } else if (sub.data?.totals) {
        totals = sub.data.totals as Totals;
      }
    } catch (e: any) {
      // absolutely fail-soft: never throw here
      // keep totals as {}
    }

    return res.status(200).json({ ok: true, taker: taker.data, totals });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || 'internal_error' });
  }
}
