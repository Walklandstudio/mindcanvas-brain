import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

const makeToken = () =>
  [...crypto.getRandomValues(new Uint8Array(18))]
    .map((b) => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[b % 62])
    .join('');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const testId = String(req.query.testId || '');
  if (!testId) return res.status(400).json({ ok:false, error:'missing testId' });

  const { data, error } = await sbAdmin
    .from('test_links')
    .insert({ test_id: testId, token: makeToken() })
    .select('id, token')
    .maybeSingle();

  if (error) return res.status(500).json({ ok:false, error: error.message });
  res.status(200).json({ ok:true, link: data });
}
