import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

// Start a public test session for a link token.
// - validates token
// - finds the test + org_id
// - increments link use (best effort)
// - inserts a "started" test_takers row with the correct org_id
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = String(req.query.token || '').trim();
  if (!token) return res.status(400).json({ ok: false, error: 'missing token' });

  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).end();

  // 1) link -> test_id
  const linkRes = await sbAdmin
    .from('test_links') // schema is 'portal' via sbAdmin config
    .select('id, test_id, token, use_count, max_uses')
    .eq('token', token)
    .maybeSingle();

  if (linkRes.error) return res.status(500).json({ ok: false, error: linkRes.error.message });
  const link = linkRes.data;
  if (!link) return res.status(404).json({ ok: false, error: 'invalid_token' });

  // 2) test -> org_id
  const testRes = await sbAdmin
    .from('tests')
    .select('id, org_id')
    .eq('id', link.test_id as string)
    .maybeSingle();

  if (testRes.error) return res.status(500).json({ ok: false, error: testRes.error.message });
  const test = testRes.data;
  if (!test) return res.status(404).json({ ok: false, error: 'test_not_found' });
  if (!test.org_id) return res.status(500).json({ ok: false, error: 'test_missing_org_id' });

  // 3) increment use_count (best effort; ignore error)
  try {
    await sbAdmin
      .from('test_links')
      .update({ use_count: (link.use_count ?? 0) + 1 })
      .eq('id', link.id);
  } catch { /* ignore */ }

  // 4) insert test_taker (status started) — anonymous
  const takerRes = await sbAdmin
    .from('test_takers')
    .insert({
      org_id: test.org_id,      // ✅ required
      test_id: link.test_id as string,
      link_token: token,
      email: null,
      first_name: null,
      last_name: null,
      status: 'started',
    })
    .select('id')
    .maybeSingle();

  // swallow unique/duplicate errors if you add a constraint later
  if (takerRes.error && !/duplicate|unique/i.test(takerRes.error.message)) {
    return res.status(500).json({ ok: false, error: takerRes.error.message });
  }

  return res.status(200).json({ ok: true, started: true, test_id: link.test_id, org_id: test.org_id });
}
