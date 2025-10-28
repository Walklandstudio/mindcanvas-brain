import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = String(req.query.token || '').trim();
  if (!token) return res.status(400).json({ ok: false, error: 'missing token' });

  // Ensure JSON (not HTML) for wrong methods
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  // 1) Resolve token -> test_id
  const linkRes = await sbAdmin
    .from('portal.test_links')
    .select('id, test_id, use_count')
    .eq('token', token)
    .maybeSingle();

  if (linkRes.error) return res.status(500).json({ ok: false, error: linkRes.error.message });
  const link = linkRes.data;
  if (!link) return res.status(404).json({ ok: false, error: 'invalid_token' });

  // 2) Fetch test -> org_id
  const testRes = await sbAdmin
    .from('portal.tests')
    .select('id, org_id')
    .eq('id', link.test_id as string)
    .maybeSingle();

  if (testRes.error) return res.status(500).json({ ok: false, error: testRes.error.message });
  const test = testRes.data;
  if (!test) return res.status(404).json({ ok: false, error: 'test_not_found' });
  if (!test.org_id) return res.status(500).json({ ok: false, error: 'test_missing_org_id' });

  // 3) Best-effort increment of link use_count (ignore errors)
  try {
    await sbAdmin
      .from('portal.test_links')
      .update({ use_count: (link.use_count ?? 0) + 1 })
      .eq('id', link.id);
  } catch {
    /* ignore */
  }

  // 4) Insert taker (status: started)
  const takerRes = await sbAdmin
    .from('portal.test_takers')
    .insert({
      org_id: test.org_id,
      test_id: link.test_id as string,
      link_token: token,
      status: 'started',
      email: null,
      first_name: null,
      last_name: null,
    })
    .select('id')
    .maybeSingle();

  if (takerRes.error) return res.status(500).json({ ok: false, error: takerRes.error.message });

  return res.status(200).json({
    ok: true,
    taker_id: takerRes.data?.id ?? null,
    test_id: link.test_id,
    org_id: test.org_id,
  });
}
