import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

type ProfileMapEntry = { profile: string; points: number };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  const token = String(req.query.token || '').trim();
  if (!token) return res.status(400).json({ ok: false, error: 'missing token' });

  const body = (req.body && typeof req.body === 'object') ? req.body as any : {};
  const answers: Record<string, number> = body.answers || {}; // qid -> 1..N

  // taker (latest for token)
  const tr = await sbAdmin
    .from('test_takers')
    .select('id')
    .eq('link_token', token)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (tr.error) return res.status(500).json({ ok: false, error: tr.error.message });
  if (!tr.data) return res.status(404).json({ ok: false, error: 'taker_not_found' });

  const takerId = tr.data.id as string;

  const qids = Object.keys(answers);
  // fetch profile_map/category to compute
  const qs = await sbAdmin
    .from('test_questions')
    .select('id, category, profile_map')
    .in('id', qids.length ? qids : ['00000000-0000-0000-0000-000000000000']);
  if (qs.error) return res.status(500).json({ ok: false, error: qs.error.message });

  // store answers
  if (qids.length) {
    const rows = qids.map((qid) => ({
      taker_id: takerId,
      question_id: qid,
      choice: Math.max(1, Math.min(10, Number(answers[qid] || 0))),
    }));
    const ins = await sbAdmin.from('test_answers').insert(rows);
    if (ins.error) return res.status(500).json({ ok: false, error: ins.error.message });
  }

  // compute profile totals from profile_map (ignore category = 'qual')
  const totals: Record<string, number> = {};
  (qs.data || []).forEach((q: any) => {
    if (q.category === 'qual') return;
    const sel = Math.max(1, Math.min(10, Number(answers[q.id] || 0)));
    const pm: ProfileMapEntry[] = Array.isArray(q.profile_map) ? q.profile_map : [];
    const entry = pm[sel - 1];
    if (entry && entry.profile && typeof entry.points === 'number') {
      totals[entry.profile] = (totals[entry.profile] || 0) + entry.points;
    }
  });

  // upsert result & mark taker completed
  const upsert = await sbAdmin
    .from('test_results')
    .upsert({ taker_id: takerId, totals }, { onConflict: 'taker_id' })
    .select('id')
    .maybeSingle();
  if (upsert.error) return res.status(500).json({ ok: false, error: upsert.error.message });

  await sbAdmin.from('test_takers').update({ status: 'completed' }).eq('id', takerId);

  return res.status(200).json({ ok: true, taker_id: takerId, totals });
}
