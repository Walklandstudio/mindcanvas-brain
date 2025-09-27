import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type ResultRow = { profile_code: string | null };

export async function GET() {
  // Pull profile_code for all computed results and aggregate in Node
  const { data, error } = await supabaseAdmin
    .from('mc_results')
    .select('profile_code');

  if (error) {
    return NextResponse.json({ items: [], error: error.message }, { status: 500 });
  }

  const rows = (data as ResultRow[]) || [];
  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    if (!r.profile_code) return acc;
    acc[r.profile_code] = (acc[r.profile_code] || 0) + 1;
    return acc;
  }, {});

  const items = Object.keys(counts).map((code) => ({ code, count: counts[code] }));
  return NextResponse.json({ items });
}
