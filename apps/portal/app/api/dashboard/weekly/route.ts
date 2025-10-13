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

  let q = supabaseAdmin
    .from('mc_submissions')
    .select('created_at')
    .gte('created_at', since.toISOString());

  if (testSlug && testSlug !== 'all') q = q.eq('test_slug', testSlug);
  if (company) q = q.eq('company', company);
  if (team) q = q.eq('team', team);

  const r = await q;
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 400 });

  // group by day client-side
  const buckets = new Map<string, number>();
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const key = new Date(d.getTime() - (days - 1 - i) * 86400000).toISOString().slice(0, 10);
    buckets.set(key, 0);
  }

  for (const row of r.data ?? []) {
    const key = new Date(row.created_at).toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  const series = Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
  return NextResponse.json({ series });
}
