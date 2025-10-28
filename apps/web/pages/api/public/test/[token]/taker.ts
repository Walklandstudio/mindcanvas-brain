import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({ok:false,error:'method_not_allowed'}); }
  const token = String(req.query.token||'').trim();
  if (!token) return res.status(400).json({ok:false,error:'missing token'});

  const body = (req.body && typeof req.body === 'object') ? req.body : {};
  const { email=null, first_name=null, last_name=null, phone=null } = body as any;

  // latest taker for this token
  const tr = await sbAdmin
    .from('test_takers')
    .select('id').eq('link_token', token)
    .order('created_at', { ascending:false }).limit(1).maybeSingle();
  if (tr.error) return res.status(500).json({ok:false,error:tr.error.message});
  if (!tr.data) return res.status(404).json({ok:false,error:'taker_not_found'});

  const up = await sbAdmin.from('test_takers')
    .update({ email, first_name, last_name, phone })
    .eq('id', tr.data.id)
    .select('id').maybeSingle();
  if (up.error) return res.status(500).json({ok:false,error:up.error.message});

  return res.status(200).json({ok:true, taker_id: up.data?.id});
}
