import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = String(req.query.token || '').trim();
  if (!token) return res.status(400).json({ ok: false, error: 'missing token' });

  // 1) resolve token -> test_id
  const link = await sbAdmin
    .from('test_links')
    .select('test_id')
    .eq('token', token)
    .maybeSingle();

  if (link.error) return res.status(500).json({ ok: false, error: link.error.message });
  if (!link.data) return res.status(404).json({ ok: false, error: 'invalid_token' });

  // 2) fetch ordered questions
  const q = await sbAdmin
    .from('test_questions')
    .select('id, idx, order, type, text, options')
    .eq('test_id', link.data.test_id)
    .order('order', { ascending: true, nullsFirst: true })
    .order('idx',   { ascending: true, nullsFirst: true });

  if (q.error) return res.status(500).json({ ok: false, error: q.error.message });
  return res.status(200).json({ ok: true, questions: q.data ?? [] });
}

