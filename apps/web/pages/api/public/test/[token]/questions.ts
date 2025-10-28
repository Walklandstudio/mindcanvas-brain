import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.query.token as string | undefined;
  if (!token) return res.status(400).json({ ok: false, error: 'missing_token' });

  try {
    const db = sbAdmin.schema('portal');

    // token -> test
    const link = await db
      .from('test_links')
      .select('test_id')
      .eq('token', token)
      .maybeSingle();
    if (link.error) return res.status(500).json({ ok: false, error: link.error.message });
    if (!link.data) return res.status(404).json({ ok: false, error: 'link_not_found' });

    // fetch ordered questions
    const qs = await db
      .from('test_questions')
      .select('id, idx, "order", type, text, options, profile_map')
      .eq('test_id', link.data.test_id)
      .order('idx', { ascending: true });

    if (qs.error) return res.status(500).json({ ok: false, error: qs.error.message });

    return res.status(200).json({ ok: true, questions: qs.data ?? [] });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || 'internal_error' });
  }
}

