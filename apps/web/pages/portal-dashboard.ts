import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const org = (req.query.org as string || '').trim();
    const testId = (req.query.testId as string || '').trim() || null;

    if (!org) return res.status(400).json({ ok: false, error: 'Missing org (slug) query param' });

    const { data, error } = await supabaseAdmin.rpc('fn_get_dashboard_data', {
      p_org_slug: org,
      p_test_id: testId || null,
    });

    if (error) return res.status(500).json({ ok: false, error: error.message || 'RPC failed' });

    const payload = data ?? { frequencies: [], profiles: [], top3: [], bottom3: [], overall: {} };
    return res.status(200).json({ ok: true, data: payload });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message || 'Unexpected error' });
  }
}
