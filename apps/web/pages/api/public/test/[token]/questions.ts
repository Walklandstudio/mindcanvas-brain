import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = String(req.query.token || '').trim();
  if (!token) return res.status(400).json({ ok: false, error: 'missing token' });

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  // resolve token -> test_id
  const link = await sbAdmin
    .from('test_links')                 // 👈 no schema prefix
    .select('id, test_id')
    .eq('token', token)
    .maybeSingle();

  if (link.error) return res.status(500).json({ ok: false, error: link.error.message });
  if (!link.data) return res.status(404).json({ ok: false, error: 'invalid_token' });

  // fetch test name
  let testName: string | null = null;
  const t = await sbAdmin
    .from('tests')
    .select('name')
    .eq('id', link.data.test_id as string)
    .maybeSingle();
  if (!t.error && t.data) testName = (t.data as any).name ?? null;

  // fetch questions
  const qs = await sbAdmin
    .from('test_questions')
    .select('id, idx, "order", type, text, options, category')
    .eq('test_id', link.data.test_id as string)
    .order('order', { ascending: true, nullsFirst: true })
    .order('idx',   { ascending: true, nullsFirst: true });

  if (qs.error) return res.status(500).json({ ok: false, error: qs.error.message });

  return res.status(200).json({
    ok: true,
    test_name: testName,
    questions: qs.data ?? [],
  });
}

