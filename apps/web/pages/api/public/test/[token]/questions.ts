import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = String(req.query.token || '').trim();
  if (!token) return res.status(400).json({ ok:false, error:'missing token' });
  if (req.method !== 'POST') return res.status(405).end();

  const body = (req.body && typeof req.body === 'object') ? req.body : {};
  const answers: Record<string, number> = body.answers || {}; // questionId -> 1..N (index into options)

  // link -> test
  const link = await sbAdmin.from('test_links').select('test_id').eq('token', token).maybeSingle();
  if (link.error) return res.status(500).json({ ok:false, error:link.error.message });
  if (!link.data) return res.status(404).json({ ok:false, error:'invalid_token' });

  // taker (latest)
  const taker = await sbAdmin.from('test_takers')
    .select('id').eq('link_token', token)
    .order('created_at', { ascending:false }).limit(1).maybeSingle();
  if (taker.error) return res.status(500).json({ ok:false, error:taker.error.message });
  if (!taker.data) return res.status(404).json({ ok:false, error:'taker_not_found' });
  const takerId = taker.data.id as string;

  // fetch questions' profile_map and category for all answered qids
  const qids = Object.keys(answers);
  const qs = await sbAdmin.from('test_questions')
    .select('id, category, profile_map')
    .in('id', qids.length ? qids : ['00000000-0000-0000-0000-000000000000']);
  if (qs.error) return res.status(500).json({ ok:false, error:qs.error.message });

  // store answers
  if (qids.length) {
    const rows = qids.map((qid) => ({
      taker_id: takerId,
      question_id: qid,
      choice: Math.max(1, Math.min(5, Number(answers[qid] || 0))), // still stored 1..N
    }));
    const ins = await sbAdmin.from('test_answers').insert(rows);
    if (ins.error) return res.status(500).json({ ok:false, error: ins.error.message });
  }

  // compute profile totals using profile_map (ignore qual)
  const totals: Record<string, number> = {};
  (qs.data || []).forEach((q) => {
    if (q.category === 'qual') return;
    const sel = Math.max(1, Math.min(10, Number(answers[q.id] || 0)));
    const pm = Array.isArray(q.profile_map as any) ? (q.profile_map as any) : [];
    const entry = pm[sel - 1];
    if (entry && entry.profile && typeof entry.points === 'number') {
      totals[entry.profile] = (totals[entry.profile] || 0) + entry.points;
    }
  });

  await sbAdmin.from('test_results')
    .upsert({ taker_id: takerId, totals }, { onConflict: 'taker_id' })
    .select('id').maybeSingle();

  await sbAdmin.from('test_takers').update({ status: 'completed' }).eq('id', takerId);

  return res.status(200).json({ ok:true, taker_id: takerId, totals });
}

