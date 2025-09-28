import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type SubRow = { test_slug: string | null };

export async function GET() {
  // Try with test_slug
  let r = await supabaseAdmin.from('mc_submissions').select('test_slug');

  // Fallback if column doesn't exist
  if (r.error && /test_slug/.test(r.error.message)) {
    return NextResponse.json({ tests: [] }); // no filter available
  }
  if (r.error) {
    return NextResponse.json({ error: r.error.message }, { status: 500 });
  }

  const slugs = new Map<string, number>();
  ((r.data ?? []) as SubRow[]).forEach((row) => {
    if (!row.test_slug) return;
    slugs.set(row.test_slug, (slugs.get(row.test_slug) ?? 0) + 1);
  });

  const tests = Array.from(slugs.entries())
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  return NextResponse.json({ tests });
}
