import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';
function token(len=22){const a='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';return Array.from({length:len},()=>a[Math.floor(Math.random()*a.length)]).join('');}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({ok:false,error:'method_not_allowed'}); }
  const testId = String(req.query.testId||'').trim();
  if (!testId) return res.status(400).json({ok:false,error:'missing testId'});

  const tok = token();
  const ins = await sbAdmin.from('test_links').insert({ test_id: testId, token: tok, max_uses: null, use_count: 0 }).select('id, token').maybeSingle();
  if (ins.error) return res.status(500).json({ok:false,error:ins.error.message});
  return res.status(200).json({ok:true, token: ins.data?.token});
}
