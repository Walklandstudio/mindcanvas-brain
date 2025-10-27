// apps/web/pages/api/tests/[testId]/links.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const testId = String(req.query.testId || '');
  if (!testId) return res.status(400).json({ ok:false, error:'missing testId' });

  const { data, error } = await sbAdmin
    .from('test_links')
    .select('id, token, use_count, max_uses')
    .eq('test_id', testId)
    .order('created_at', { ascending: false } as any) /* ignore if no column */;

  if (error) return res.status(500).json({ ok:false, error: error.message });
  res.status(200).json({ ok:true, links: data ?? [] });
}
