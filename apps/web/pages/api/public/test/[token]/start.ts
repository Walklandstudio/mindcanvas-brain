import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

// Idempotent start: validates token, increments link use, creates a "started" taker
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = String(req.query.token || '').trim();
  if (!token) return res.status(400).json({ ok: false, error: 'missing token' });

  // allow POST (normal) and GET (debug)
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).end();

  // 1) link -> test
  const linkRes = await sbAdmin
    .from('test_links') // default schema = 'portal'
    .select('id, test_id, token, use_count, max_uses')
    .eq('token', token)
    .maybeSingle();

  if (linkRes.error) return res.status(500).json({ ok: false, error: linkRes.error.message });
  const link = linkRes.data;
  if (!link) return res.status(404).json({ ok: false, error: 'invalid_token' });

  // 2) increment use_count (best-effort; ignore errors)
  try {
    await sbAdmin
      .from('test_links')
      .update({ use_count: (link.use_count ?? 0) + 1 })
      .eq('id', link.id);
  } catch {
    /* ignore */
  }

  // 3) insert test_taker (status started) — anonymous taker, idempotent-ish
  const takerRes = await sbAdmin
    .from('test_takers')
    .insert({
      org_id: null,
      test_id: link.test_id as string,
      link_token: token,
      email: null,
      first_name: null,
      last_name: null,
      status: 'started',
    })
    .select('id')
    .maybeSingle();

  // swallow unique/duplicate errors if you added constraints
  if (takerRes.error && !/duplicate|unique/i.test(takerRes.error.message)) {
    return res.status(500).json({ ok: false, error: takerRes.error.message });
  }

  return res.status(200).json({ ok: true, started: true, test_id: link.test_id });
}
