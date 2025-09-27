import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: Request) {
  const { data, error } = await supabaseAdmin
    .from('mc_results') // table storing computed results
    .select('profile_code, count:profile_code', { count: 'exact', head: false })
    .neq('profile_code', null);

  if (error) return NextResponse.json({ items: [], error: error.message }, { status: 500 });

  // supabase-js doesn't alias like SQL; do a manual aggregate if needed
  const counts: Record<string, number> = {};
  (data as any[]).forEach((r: any) => {
    counts[r.profile_code] = (counts[r.profile_code] || 0) + 1;
  });
  const items = Object.entries(counts).map(([code, count]) => ({ code, count }));
  return NextResponse.json({ items });
}
