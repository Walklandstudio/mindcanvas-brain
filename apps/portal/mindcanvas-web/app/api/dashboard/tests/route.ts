import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type SubRow = { test_slug: string | null };

export async function GET() {
  // Pull distinct slugs client-side (safe for current scale).
  const r = await supabaseAdmin
    .from('mc_submissions')
    .select('test_slug')
    .not('test_slug', 'is', null);

  if (r.error) {
    return NextResponse.json({ error: r.error.message }, { status: 500 });
  }

  const slugs = new Map<string, number>();
  ((r.data ?? []) as SubRow[]).forEach((row) => {
    if (!row.test_slug) return;
    slugs.set(row.test_slug, (slugs.get(row.test_slug) ?? 0) + 1);
  });

  const out = Array.from(slugs.entries()).map(([slug, count]) => ({ slug, count }));
  out.sort((a, b) => a.slug.localeCompare(b.slug));

  return NextResponse.json({ tests: out });
}
