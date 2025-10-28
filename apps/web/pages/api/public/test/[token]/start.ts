import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.query.token as string | undefined;
  if (!token) return res.status(200).json({ ok: false, stage: 'init', error: 'missing_token' });

  try {
    const db = sbAdmin.schema('portal');

    // 1) Find link quickly
    const link = await db
      .from('test_links')
      .select('test_id, org_id, token')
      .eq('token', token)
      .maybeSingle();

    if (link.error) return res.status(200).json({ ok: false, stage: 'link_lookup', error: link.error.message });
    if (!link.data)  return res.status(200).json({ ok: false, stage: 'link_lookup', error: 'link_not_found' });

    // 2) Ensure a taker row exists (create if not)
    const latest = await db
      .from('test_takers')
      .select('id')
      .eq('link_token', token)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let takerId = latest.data?.id as string | undefined;
    if (!takerId) {
      const ins = await db
        .from('test_takers')
        .insert({
          org_id: link.data.org_id,
          test_id: link.data.test_id,
          link_token: token,
          status: 'started',
          first_name: null,
          last_name: null,
          email: null,
        })
        .select('id')
        .single();

      if (ins.error) return res.status(200).json({ ok: false, stage: 'taker_insert', error: ins.error.message });
      takerId = ins.data.id;
    }

    // ✅ Immediate success (no RPC, no heavy work)
    return res.status(200).json({ ok: true, taker_id: takerId, test_id: link.data.test_id });
  } catch (e: any) {
    return res.status(200).json({ ok: false, stage: 'catch', error: e?.message || 'internal_error' });
  }
}
