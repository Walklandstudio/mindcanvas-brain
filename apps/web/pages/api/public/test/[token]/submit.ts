import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

// Minimal demo submit: resolve token -> test/org, mark taker "submitted".
// (We can extend to store answers once you're ready.)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = String(req.query.token || '').trim();
  if (!token) return res.status(400).json({ ok: false, error: 'missing token' });
  if (req.method !== 'POST') return res.status(405).end();

  // Resolve link
  const linkRes = await sbAdmin.from('test_links')
    .select('id, test_id, token').eq('token', token).maybeSingle();
  if (linkRes.error) return res.status(500).json({ ok:false, error: linkRes.error.message });
  const link = linkRes.data;
  if (!link) return res.status(404).json({ ok:false, error: 'invalid_token' });

  // Find the most recent taker row for this token (created by /start)
  const takerRes = await sbAdmin.from('test_takers')
    .select('id, status').eq('link_token', token)
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(1).maybeSingle();

  if (takerRes.error) return res.status(500).json({ ok:false, error: takerRes.error.message });
  if (!takerRes.data) {
    return res.status(404).json({ ok:false, error: 'taker_not_found' });
  }

  // Mark submitted
  const upd = await sbAdmin.from('test_takers')
    .update({ status: 'submitted' })
    .eq('id', takerRes.data.id)
    .select('id').maybeSingle();

  if (upd.error) return res.status(500).json({ ok:false, error: upd.error.message });

  // Optionally accept and ignore answers for now
  // const answers = (req.body && typeof req.body === 'object') ? req.body.answers : null;

  return res.status(200).json({ ok:true, taker_id: upd.data?.id });
}
