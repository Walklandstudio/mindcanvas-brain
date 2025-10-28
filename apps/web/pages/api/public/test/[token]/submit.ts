import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

type ClientPayload =
  | { mode: 'totals'; totals: Record<string, number>; taker?: { first_name?: string; last_name?: string; email?: string } }
  | { mode: 'answers'; answers: Array<{ question_id: string; option_index: number; profile: string; points: number }>; taker?: { first_name?: string; last_name?: string; email?: string } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  const token = req.query.token as string | undefined;
  if (!token) return res.status(400).json({ ok: false, error: 'missing_token' });

  const db = sbAdmin.schema('portal');

  try {
    // 1) Find link -> test
    const link = await db.from('test_links')
      .select('test_id, token, use_count')
      .eq('token', token)
      .maybeSingle();
    if (link.error) return res.status(500).json({ ok: false, error: link.error.message });
    if (!link.data)  return res.status(404).json({ ok: false, error: 'link_not_found' });

    // 2) Find (or create) taker for this token (latest row)
    const latest = await db.from('test_takers')
      .select('id, org_id, test_id, first_name, last_name, email, status')
      .eq('link_token', token)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest.error) return res.status(500).json({ ok: false, error: latest.error.message });
    if (!latest.data)  return res.status(404).json({ ok: false, error: 'taker_not_found' });

    // 3) Parse client payload
    const body = (req.body || {}) as ClientPayload;
    let totals: Record<string, number> = {};

    if ((body as any).mode === 'totals' && body && 'totals' in body) {
      totals = body.totals || {};
    } else if ((body as any).mode === 'answers' && body && 'answers' in body) {
      // derive totals from per-answer profile+points
      for (const a of body.answers) {
        if (!a || typeof a.points !== 'number' || !a.profile) continue;
        totals[a.profile] = (totals[a.profile] || 0) + a.points;
      }
    } else {
      return res.status(400).json({ ok: false, error: 'invalid_payload' });
    }

    // 4) Upsert submission (just insert newest)
    const ins = await db.from('test_submissions').insert({
      taker_id: latest.data.id,
      test_id: link.data.test_id,
      link_token: token,
      totals,
      raw_answers: (body as any).answers ? (body as any).answers : null,
    }).select('id').single();
    if (ins.error) return res.status(500).json({ ok: false, error: ins.error.message });

    // 5) Mark taker completed (optional but useful)
    await db.from('test_takers')
      .update({ status: 'completed' })
      .eq('id', latest.data.id);

    return res.status(200).json({ ok: true, submission_id: ins.data.id });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || 'internal_error' });
  }
}
