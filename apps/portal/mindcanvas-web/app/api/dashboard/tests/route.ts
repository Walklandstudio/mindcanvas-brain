import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Row = { test_slug: string | null };

export async function GET() {
  const result = await supabaseAdmin.from('mc_submissions').select('test_slug');

  if (result.error) {
    // If the column doesn't exist yet, just return no tests (UI will show "All tests")
    if (/test_slug/.test(result.error.message)) {
      return NextResponse.json({ tests: [] });
    }
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  const counts = new Map<string, number>();
  for (const row of (result.data ?? []) as Row[]) {
    if (!row.test_slug) continue;
    counts.set(row.test_slug, (counts.get(row.test_slug) ?? 0) + 1);
  }

  const tests = Array.from(counts.entries())
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  return NextResponse.json({ tests });
}
