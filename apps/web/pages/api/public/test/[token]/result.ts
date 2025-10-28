import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') { res.setHeader('Allow','GET'); return res.status(405).json({ok:false,error:'method_not_allowed'}); }
  const token = String(req.query.token||'').trim();
  if (!token) return res.status(400).json({ok:false,error:'missing token'});

  // taker (latest by token)
  const tr = await sbAdmin.from('test_takers')
    .select('id, first_name, last_name, email, status')
    .eq('link_token', token)
    .order('created_at', { ascending:false })
    .limit(1).maybeSingle();
  if (tr.error) return res.status(500).json({ok:false,error:tr.error.message});
  if (!tr.data) return res.status(404).json({ok:false,error:'taker_not_found'});

  // result
  const rr = await sbAdmin.from('test_results')
    .select('totals').eq('taker_id', tr.data.id).maybeSingle();
  if (rr.error) return res.status(500).json({ok:false,error:rr.error.message});

  return res.status(200).json({ ok:true, taker: tr.data, totals: rr.data?.totals || {} });
}
