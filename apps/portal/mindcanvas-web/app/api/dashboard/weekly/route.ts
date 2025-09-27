import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tf = (searchParams.get('tf') || '30d') as '7d'|'30d'|'90d';
  const days = tf === '7d' ? 7 : tf === '90d' ? 90 : 30;

  // Example: group submissions by ISO week
  const { data, error } = await supabaseAdmin.rpc('mc_weekly_submissions', { days_window: days });
  if (error) return NextResponse.json({ items: [], error: error.message }, { status: 500 });

  return NextResponse.json({ items: data as { week: string; submissions: number }[] });
}
