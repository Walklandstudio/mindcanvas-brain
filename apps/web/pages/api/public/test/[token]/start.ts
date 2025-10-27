// apps/web/pages/api/public/test/[token]/start.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const token = String(req.query.token || '');
  const { data: link, error: e1 } = await sbAdmin
    .from('test_links').select('id,test_id,token')
    .eq('token', token).maybeSingle();
  if (e1 || !link) return res.status(404).json({ ok:false, error:'invalid_token' });

  const { data: test } = await sbAdmin.from('tests').select('org_id').eq('id', link.test_id).maybeSingle();

  const { data: taker, error: e2 } = await sbAdmin
    .from('test_takers')
    .insert({ org_id: test?.org_id, test_id: link.test_id, link_token: token, status: 'started' })
    .select('id')
    .maybeSingle();

  if (e2) return res.status(500).json({ ok:false, error: e2.message });
  res.status(200).json({ ok:true, taker_id: taker?.id });
}
