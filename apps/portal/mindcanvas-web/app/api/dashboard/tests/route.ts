import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const r = await supabaseAdmin
    .from('mc_submissions')
    .select('test_slug')
    .not('test_slug', 'is', null);

  if (r.error) return NextResponse.json({ tests: [] });

  const set = new Set<string>();
  for (const row of r.data ?? []) {
    const v = typeof row.test_slug === 'string' ? row.test_slug.trim() : '';
    if (v) set.add(v);
  }
  return NextResponse.json({ tests: Array.from(set).sort() });
}
