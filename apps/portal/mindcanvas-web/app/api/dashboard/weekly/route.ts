// app/api/dashboard/weekly/route.ts
import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key, { auth: { persistSession: false } });

export async function GET() {
  // Last 8 ISO weeks (YYYY-WW)
  const { data, error } = await supabase.rpc('mc_weekly_submissions'); // optional RPC
  if (!error && Array.isArray(data)) {
    return NextResponse.json(data, { status: 200 });
  }
  // Fallback: simple group by week using created_at::date
  const { data: rows, error: e2 } = await supabase
    .from('mc_submissions')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(800);
  if (e2) return NextResponse.json([], { status: 200 });

  const map = new Map<string, number>();
  for (const r of rows ?? []) {
    const d = new Date(r.created_at as string);
    const y = d.getUTCFullYear();
    const onejan = new Date(Date.UTC(y, 0, 1));
    const week = Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getUTCDay() + 1) / 7);
    const key = `${y}-W${String(week).padStart(2, '0')}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const out = Array.from(map.entries())
    .map(([week, submissions]) => ({ week, submissions }))
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-8);
  return NextResponse.json(out, { status: 200 });
}
