import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Flow = 'A' | 'B' | 'C' | 'D';
type Row = Record<string, unknown>;
const s = (r: Row, k: string) =>
  typeof r[k] === 'string' ? (r[k] as string) : r[k] == null ? null : String(r[k]);
const n = (r: Row, k: string, d = 0) => {
  const v = r[k];
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const x = Number(v);
    if (Number.isFinite(x)) return x;
  }
  return d;
};

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // Ensure submission exists
  const { data: sub, error: sErr } = await supabaseAdmin
    .from('mc_submissions')
    .select('id, test_id')
    .eq('id', id)
    .maybeSingle<{ id: string; test_id: string }>();
  if (sErr || !sub) {
    return NextResponse.json({ error: sErr?.message ?? 'Submission not found' }, { status: 404 });
  }

  // Answers → chosen option ids (supports single or multi across various column shapes)
  const { data: arows, error: aErr } = await supabaseAdmin
    .from('mc_answers')
    .select('*')
    .eq('submission_id', sub.id);
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

  const selected = new Set<string>();
  for (const r of arows ?? []) {
    const row = r as Row;
    const payload =
      row['value'] ?? row['selected'] ?? row['answer'] ?? row['option_id'] ?? row['selected_ids'] ?? row['choices'] ?? null;

    if (Array.isArray(payload)) {
      for (const v of payload as unknown[]) selected.add(String(v));
    } else if (payload != null) {
      selected.add(String(payload));
    }
  }

  // Options metadata used
  const { data: orows, error: oErr } = await supabaseAdmin
    .from('mc_options')
    .select('id, question_id, points, profile_code')
    .in('id', Array.from(selected));
  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });

  // Fetch flow tag for touched questions
  const qIds = Array.from(new Set((orows ?? []).map((o) => (o as Row).question_id as string))).filter(Boolean);
  const { data: qrows, error: qErr } = await supabaseAdmin
    .from('mc_questions')
    .select('id, flow')
    .in('id', qIds);
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  const flowByQ = new Map<string, Flow>();
  for (const q of qrows ?? []) {
    const row = q as Row;
    const f = (s(row, 'flow') ?? '') as string;
    if (f === 'A' || f === 'B' || f === 'C' || f === 'D') flowByQ.set(String(row.id), f);
  }

  // Tally profile points & flow points
  const profilePts: Record<string, number> = {};
  const flowPts: Record<Flow, number> = { A: 0, B: 0, C: 0, D: 0 };

  for (const o of orows ?? []) {
    const row = o as Row;
    const qid = s(row, 'question_id');
    const pts = n(row, 'points', 1);

    const pcode = (s(row, 'profile_code') ?? '').toUpperCase();
    if (pcode) profilePts[pcode] = (profilePts[pcode] ?? 0) + pts;

    const f = qid ? flowByQ.get(qid) : undefined;
    if (f) flowPts[f] = (flowPts[f] ?? 0) + pts;
  }

  // Choose top profile
  const topProfile =
    Object.entries(profilePts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'P1';

  // Normalize flow 0..100
  const flowTotal = (flowPts.A ?? 0) + (flowPts.B ?? 0) + (flowPts.C ?? 0) + (flowPts.D ?? 0);
  const toPct = (v: number) => (flowTotal > 0 ? Math.round((v / flowTotal) * 100) : 0);

  const payload = {
    submission_id: sub.id,
    report_id: sub.id,
    profile_code: topProfile,
    flow_a: toPct(flowPts.A ?? 0),
    flow_b: toPct(flowPts.B ?? 0),
    flow_c: toPct(flowPts.C ?? 0),
    flow_d: toPct(flowPts.D ?? 0),
  };

  const { error: rErr } = await supabaseAdmin
    .from('mc_results')
    .upsert(payload, { onConflict: 'submission_id' });
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  return NextResponse.json({ reportId: sub.id });
}

