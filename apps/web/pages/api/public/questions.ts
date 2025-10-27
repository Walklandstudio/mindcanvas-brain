// apps/web/pages/api/public/test/[token]/questions.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const token = String(req.query.token || '');
  const { data: link, error } = await sbAdmin
    .from('test_links').select('test_id')
    .eq('token', token).maybeSingle();
  if (error || !link) return res.status(404).json({ ok:false, error:'invalid_token' });

  const { data: questions, error: e2 } = await sbAdmin
    .from('test_questions')

    .select('idx,type,text,options')
    .eq('test_id', link.test_id)
    .order('idx');
  if (e2) return res.status(500).json({ ok:false, error: e2.message });

  res.status(200).json({ ok:true, questions });
}
