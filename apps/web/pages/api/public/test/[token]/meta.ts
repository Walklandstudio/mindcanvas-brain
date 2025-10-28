import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.query.token as string;
  if (!token) return res.status(400).json({ ok: false, error: 'missing_token' });

  try {
    const db = sbAdmin.schema('portal');

    // Resolve token -> test_id
    const link = await db
      .from('test_links')
      .select('test_id, token')
      .eq('token', token)
      .maybeSingle();
    if (link.error) throw link.error;
    if (!link.data) return res.status(404).json({ ok: false, error: 'link_not_found' });

    // Fetch test meta
    const test = await db
      .from('tests')
      .select('id, name, slug, mode, meta')
      .eq('id', link.data.test_id)
      .maybeSingle();
    if (test.error) throw test.error;
    if (!test.data) return res.status(404).json({ ok: false, error: 'test_not_found' });

    // Normalize meta pieces
    const meta = test.data.meta || {};
    const frequencies = Array.isArray(meta.frequencies) ? meta.frequencies : [];
    const profiles   = Array.isArray(meta.profiles) ? meta.profiles : [];
    const thresholds = meta.thresholds || null;

    return res.json({
      ok: true,
      test: { id: test.data.id, name: test.data.name, slug: test.data.slug, mode: test.data.mode ?? 'full' },
      meta: { frequencies, profiles, thresholds },
    });
  } catch (e: any) {
    console.error('meta error', e?.message || e);
    return res.status(500).json({ ok: false, error: e?.message || 'internal_error' });
  }
}
