import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

function makeToken() {
  // short, URL-safe token
  const s = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  return s.replace(/[^a-z0-9]/gi, '').slice(0, 16);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  const testId = req.query.id as string | undefined;
  if (!testId) return res.status(400).json({ ok: false, error: 'missing_test_id' });

  try {
    const db = sbAdmin.schema('portal');

    // 1) Look up org_id from the test
    const test = await db
      .from('tests')
      .select('id, org_id')
      .eq('id', testId)
      .maybeSingle();

    if (test.error) return res.status(500).json({ ok: false, error: test.error.message });
    if (!test.data) return res.status(404).json({ ok: false, error: 'test_not_found' });

    // 2) Create unique token
    let token = makeToken();
    for (let i = 0; i < 5; i++) {
      const exists = await db.from('test_links').select('id').eq('token', token).maybeSingle();
      if (!exists.data) break;
      token = makeToken();
    }

    // 3) Insert link with org_id + use_count default 0
    const ins = await db
      .from('test_links')
      .insert({
        test_id: test.data.id,
        org_id: test.data.org_id,
        token,
        max_uses: null, // or set from req.body.max_uses
      })
      .select('id, token, max_uses, use_count')
      .single();

    if (ins.error) return res.status(500).json({ ok: false, error: ins.error.message });

    return res.status(200).json({ ok: true, link: ins.data });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || 'internal_error' });
  }
}
