import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get('days') || 30);
  const testSlug = (searchParams.get('testSlug') || '').trim();
  const company = (searchParams.get('company') || '').trim();
  const team = (searchParams.get('team') || '').trim();

  const since = new Date();
  since.setDate(since.getDate() - Math.max(1, days));

  // submissions
  let s = supabaseAdmin
    .from('mc_submissions')
    .select('id')
    .gte('created_at', since.toISOString());

  if (testSlug && testSlug !== 'all') s = s.eq('test_slug', testSlug);
  if (company) s = s.eq('company', company);
  if (team) s = s.eq('team', team);

  const subRes = await s;
  if (subRes.error) return NextResponse.json({ buckets: [], total: 0 });

  const ids = (subRes.data ?? []).map((r) => r.id as string).filter(Boolean);
  if (!ids.length) return NextResponse.json({ buckets: [], total: 0 });

  // answers
  const ansRes = await supabaseAdmin
    .from('mc_answers')
    .select('submission_id, points, profile_code')
    .in('submission_id', ids);

  if (ansRes.error) return NextResponse.json({ buckets: [], total: 0 });

  // profile names
  const profRes = await supabaseAdmin.from('profiles').select('code,name');
  const nameMap = new Map<string, string>();
  for (const p of profRes.data ?? []) {
    nameMap.set(String(p.code), String(p.name ?? p.code));
  }

  // aggregate per submission → pick primary profile
  const bySub = new Map<string, Record<string, number>>();
  for (const a of ansRes.data ?? []) {
    const sid = String(a.submission_id);
    const pc = String(a.profile_code ?? '');
    const pts = Number(a.points || 0);
    if (!pc) continue;
    const agg = bySub.get(sid) ?? {};
    agg[pc] = (agg[pc] ?? 0) + pts;
    bySub.set(sid, agg);
  }

  const counts: Record<string, number> = {};
  for (const agg of bySub.values()) {
    const entries = Object.entries(agg).sort((x, y) => y[1] - x[1]);
    if (entries.length && entries[0][1] > 0) {
      const top = entries[0][0];
      counts[top] = (counts[top] ?? 0) + 1;
    }
  }

  const buckets = Object.entries(counts)
    .map(([code, count]) => ({
      code,
      name: nameMap.get(code) || code,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const total = buckets.reduce((a, b) => a + b.count, 0);
  return NextResponse.json({ buckets, total });
}
