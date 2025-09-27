import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Timeframe = '7d' | '30d' | '90d';
type RpcRow = { profile_code: string | null; count: number };

function tfToDays(tf: Timeframe): number {
  switch (tf) {
    case '7d': return 7;
    case '90d': return 90;
    default: return 30;
  }
}

export async function GET(req: NextRequest) {
  const tf = (req.nextUrl.searchParams.get('tf') as Timeframe) || '30d';
  const days = tfToDays(tf);

  const { data, error } = await supabaseAdmin.rpc('mc_profile_distribution', {
    days_window: days,
  });

  if (error) {
    return NextResponse.json(
      { items: [], error: error.message },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as RpcRow[];
  const items = rows
    .filter((r) => r.profile_code)
    .map((r) => ({ code: r.profile_code as string, count: Number(r.count ?? 0) }));

  return NextResponse.json({ items });
}
