import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Timeframe = '7d' | '30d' | '90d';
type RpcRow = { week_label: string; week_start: string; submissions: number };

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

  const { data, error } = await supabaseAdmin.rpc('mc_weekly_submissions', {
    days_window: days,
  });

  if (error) {
    return NextResponse.json(
      { items: [], error: error.message },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as RpcRow[];
  // Optionally reshape week_start → just the label used by your chart
  const items = rows.map((r) => ({
    week: r.week_label,
    submissions: Number(r.submissions ?? 0),
  }));

  return NextResponse.json({ items });
}
