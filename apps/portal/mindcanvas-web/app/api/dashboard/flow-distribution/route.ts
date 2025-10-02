import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type FlowCode = 'A' | 'B' | 'C' | 'D';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get('days') || 30);
  const testSlug = (searchParams.get('testSlug') || '').trim();
  const company = (searchParams.get('company') || '').trim();
  const team = (searchParams.get('team') || '').trim();

  const since = new Date();
  since.setDate(since.getDate() - Math.max(1, days));

  // 1) pick submissions in window + filters
  let s = supabaseAdmin
    .from('mc_submissions')
    .select('id, created_at')
    .gte('created_at', since.toISOString());

  if (testSlug && testSlug !== 'all') s = s.eq('test_slug', testSlug);
  if (company) s = s.eq('company', company);
  if (team) s = s.eq('team', team);

  const subRes = await s;
  if (subRes.error) return NextResponse.json({ flow: { A: 0, B: 0, C: 0, D: 0 }, total: 0 });

  const ids = (subRes.data ?? []).map((r) => r.id as string).filter(Boolean);
  if (!ids.length) return NextResponse.json({ flow: { A: 0, B: 0, C: 0, D: 0 }, total: 0 });

  // 2) answers for those submissions
  const ansRes = await supabaseAdmin
    .from('mc_answers')
    .select('submission_id, points, flow_code, flow')
    .in('submission_id', ids);

  if (ansRes.error) return NextResponse.json({ flow: { A: 0, B: 0, C: 0, D: 0 }, total: 0 });

  // 3) For each submission, find top flow by summed points
  const counts: Record<FlowCode, number> = { A: 0, B: 0, C: 0, D: 0 };
  const bySub = new Map<string, { A: number; B: number; C: number; D: number }>();

  for (const a of ansRes.data ?? []) {
    const sid = String(a.submission_id);
    const pts = Number(a.points || 0);
    const f = (a.flow_code as string) || (a.flow as string) || '';
    if (!['A', 'B', 'C', 'D'].includes(f)) continue;
    const agg = bySub.get(sid) ?? { A: 0, B: 0, C: 0, D: 0 };
    (agg as any)[f] += pts;
    bySub.set(sid, agg);
  }

  for (const agg of bySub.values()) {
    const entries: [FlowCode, number][] = [
      ['A', agg.A],
      ['B', agg.B],
      ['C', agg.C],
      ['D', agg.D],
    ];
    entries.sort((x, y) => y[1] - x[1]);
    if (entries[0][1] > 0) counts[entries[0][0]] += 1;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return NextResponse.json({ flow: counts, total });
}
