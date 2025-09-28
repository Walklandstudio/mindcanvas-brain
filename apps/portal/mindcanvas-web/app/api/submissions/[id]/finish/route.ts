import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Freq = 'A' | 'B' | 'C' | 'D';

type Row = Record<string, unknown>;
const s = (r: Row, k: string) =>
  typeof r[k] === 'string' ? (r[k] as string) : r[k] == null ? null : String(r[k]);
const n = (r: Row, k: string, d = 0) => {
  const v = r[k];
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const num = Number(v);
    if (Number.isFinite(num)) return num;
  }
  return d;
};

// Try to read a frequency from a variety of possible fields.
// If none exist, return null (we'll just skip that option).
function freqFromOption(r: Row): Freq | null {
  const candidates = [
    s(r, 'frequency'),
    s(r, 'freq'),
    s(r, 'flow'),
    s(r, 'dimension'),
    s(r, 'band'),
  ]
    .filter(Boolean)
    .map(v => (v as string).toUpperCase());
  // Or infer from profile_code's first letter, e.g. "A1", "B2", etc.
  const fromProfile = (s(r, 'profile_code') ?? '').toUpperCase().charAt(0);
  if (fromProfile) candidates.unshift(fromProfile);

  for (const v of candidates) {
    if (v === 'A' || v === 'B' || v === 'C' || v === 'D') return v;
  }
  return null;
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // Load submission
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

  // Gather selected option IDs
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

  // Compute flow A/B/C/D (tolerant: select * and infer fields)
  const flow: Record<Freq, number> = { A: 0, B: 0, C: 0, D: 0 };

  if (selectedIds.size) {
    const { data: orows, error: oErr } = await supabaseAdmin
      .from('mc_options')
      .select('*') // <-- no hardcoded columns
      .in('id', Array.from(selectedIds));
    if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });

    for (const r of orows ?? []) {
      const row = r as Row;
      const f = freqFromOption(row);
      if (!f) continue; // skip if we can't infer a bucket
      const pts = n(row, 'points', 1);
      flow[f] = (flow[f] ?? 0) + pts;
    }
  }

  // Pick a profile_code (simple heuristic: max flow; default 'A' if all zero)
  const top = (Object.entries(flow) as [Freq, number][])
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'A';
  const profile_code = top;

  // Persist result (idempotent on submission_id)
  const payload = {
    submission_id: sub.id,
    report_id: sub.id, // stable link
    profile_code,
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

