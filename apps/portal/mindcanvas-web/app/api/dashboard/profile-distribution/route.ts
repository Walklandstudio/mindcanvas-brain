import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type SubRow = { id: string; created_at: string; test_slug: string | null };
type ResRow = { submission_id: string; profile_code: string | null };

function sinceDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const days = Number(sp.get('days') ?? '30');
  const slug = sp.get('slug') ?? undefined;
  const from = sinceDays(Number.isFinite(days) && days > 0 ? days : 30);

  // 1) Gather submission ids for time window (+ optional slug)
  let q = supabaseAdmin
    .from('mc_submissions')
    .select('id, created_at, test_slug')
    .gte('created_at', from);

  if (slug) q = q.eq('test_slug', slug);

  const subs = await q;
  if (subs.error) {
    return NextResponse.json({ error: subs.error.message }, { status: 500 });
  }

  const ids = (subs.data ?? []).map((r) => (r as SubRow).id);
  if (ids.length === 0) return NextResponse.json({ rows: [] });

  // 2) Pull results for those submissions
  const res = await supabaseAdmin
    .from('mc_results')
    .select('submission_id, profile_code')
    .in('submission_id', ids);

  if (res.error) {
    return NextResponse.json({ error: res.error.message }, { status: 500 });
  }

  const counts = new Map<string, number>();
  ((res.data ?? []) as ResRow[]).forEach((r) => {
    const code = r.profile_code ?? 'Unknown';
    counts.set(code, (counts.get(code) ?? 0) + 1);
  });

  const rows = Array.from(counts.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => a.code.localeCompare(b.code));

  return NextResponse.json({ rows });
}
