import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { PROFILE_META, type Flow } from '@/lib/profileMeta';

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

  // Submission
  const { data: sub, error: sErr } = await supabaseAdmin
    .from('mc_submissions')
    .select('id, test_id')
    .eq('id', id)
    .maybeSingle<{ id: string; test_id: string }>();
  if (sErr || !sub) return NextResponse.json({ error: sErr?.message ?? 'Submission not found' }, { status: 404 });

  // Answers (tolerant)
  const { data: arows, error: aErr } = await supabaseAdmin
    .from('mc_answers')
    .select('*')
    .eq('submission_id', sub.id);
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

  // Collect selected option IDs
  const selectedIds = new Set<string>();
  for (const r of arows ?? []) {
    const row = r as Row;
    const candidate =
      row.selected ?? row.answer ?? row.value ?? row.option_id ?? row.selected_ids ?? row.choices ?? null;

    if (Array.isArray(candidate)) {
      for (const v of candidate as unknown[]) selectedIds.add(String(v));
    } else if (candidate != null) {
      selectedIds.add(String(candidate));
    }
  }

  // Tally points by profile + flow
  const profilePts: Record<string, number> = {};
  const flow: Record<Flow, number> = { A: 0, B: 0, C: 0, D: 0 };

  if (selectedIds.size) {
    const { data: orows, error: oErr } = await supabaseAdmin
      .from('mc_options')
      .select('*') // tolerant
      .in('id', Array.from(selectedIds));
    if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });

    for (const r of orows ?? []) {
      const row = r as Row;
      const pts = n(row, 'points', 1);

      // profile tally
      const pcode = (s(row, 'profile_code') ?? '').toUpperCase();
      if (pcode) profilePts[pcode] = (profilePts[pcode] ?? 0) + pts;

      // flow tally (explicit frequency; else infer from profile’s primary flow)
      let f = (s(row, 'frequency') ?? s(row, 'freq') ?? s(row, 'flow') ?? s(row, 'dimension') ?? '').toUpperCase();
      if (f !== 'A' && f !== 'B' && f !== 'C' && f !== 'D' && pcode) {
        const meta = PROFILE_META[pcode as keyof typeof PROFILE_META];
        if (meta) f = meta.flow;
      }
      if (f === 'A' || f === 'B' || f === 'C' || f === 'D') {
        const ff = f as Flow;
        flow[ff] = (flow[ff] ?? 0) + pts;
      }
    }
  }

  // Pick top profile; fallback to one that matches top flow
  const topProfile =
    Object.entries(profilePts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    (() => {
      const keys: Flow[] = ['A', 'B', 'C', 'D'];
      const topFlow = keys.reduce<Flow>((best, k) => (flow[k] > flow[best] ? k : best), 'A');
      const match = (Object.entries(PROFILE_META) as Array<[keyof typeof PROFILE_META, { flow: Flow }]>)
        .find(([, v]) => v.flow === topFlow)?.[0];
      return match ?? 'P1';
    })();

  // If all-zero, seed the primary flow of the topProfile so the pie isn’t empty
  if ((flow.A + flow.B + flow.C + flow.D) === 0) {
    const meta = PROFILE_META[topProfile as keyof typeof PROFILE_META];
    const pf: Flow = (meta?.flow ?? 'A') as Flow;
    flow[pf] = 100;
  }

  const payload = {
    submission_id: sub.id,
    report_id: sub.id,
    profile_code: topProfile,
    flow_a: flow.A ?? 0,
    flow_b: flow.B ?? 0,
    flow_c: flow.C ?? 0,
    flow_d: flow.D ?? 0,
  };

  const { error: rErr } = await supabaseAdmin
    .from('mc_results')
    .upsert(payload, { onConflict: 'submission_id' });
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  return NextResponse.json({ reportId: sub.id });
}

