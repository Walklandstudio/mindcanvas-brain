import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Freq = 'A' | 'B' | 'C' | 'D';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // Load submission + test
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
    const raw = r as Record<string, unknown>;
    const candidate =
      raw.selected ?? raw.answer ?? raw.value ?? raw.option_id ?? raw.selected_ids ?? raw.choices ?? null;

    if (Array.isArray(candidate)) {
      for (const v of candidate as unknown[]) selectedIds.add(String(v));
    } else if (candidate != null) {
      selectedIds.add(String(candidate));
    }
  }

  // Fetch those options → get frequency & points
  let flow: Record<Freq, number> = { A: 0, B: 0, C: 0, D: 0 };
  if (selectedIds.size) {
    const { data: orows, error: oErr } = await supabaseAdmin
      .from('mc_options')
      .select('id, frequency, points')
      .in('id', Array.from(selectedIds));
    if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });

    for (const o of orows ?? []) {
      const f = (o.frequency ?? null) as Freq;
      if (!f) continue;
      const pts = typeof o.points === 'number' ? o.points : 1;
      flow[f] = (flow[f] ?? 0) + pts;
    }
  }

  // Choose a profile_code based on max flow (simple heuristic)
  const top = (Object.entries(flow) as [Freq, number][])
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'A';
  const profile_code = top; // map flow→profile if you have a mapping

  // Upsert result; use submission id as report_id for stable link
  const payload = {
    submission_id: sub.id,
    report_id: sub.id,
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

