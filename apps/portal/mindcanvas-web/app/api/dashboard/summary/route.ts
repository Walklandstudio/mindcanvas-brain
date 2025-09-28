import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type SubRow = {
  id: string;
  created_at: string;
  email: string | null;
  name?: string | null;
  phone?: string | null;
  test_slug: string | null;
};

function sinceDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const days = Number(sp.get('days') ?? '30');
  const slug = sp.get('slug') ?? undefined;

  const from = sinceDays(Number.isFinite(days) && days > 0 ? days : 30);

  let q = supabaseAdmin
    .from('mc_submissions')
    .select('id, created_at, email, name, phone, test_slug')
    .gte('created_at', from);

  if (slug) q = q.eq('test_slug', slug);

  const r = await q;

  if (r.error) {
    return NextResponse.json({ error: r.error.message }, { status: 500 });
  }

  const rows = (r.data ?? []) as SubRow[];

  // Submissions
  const submissions = rows.length;

  // Unique clients (prefer email, then phone, then name+created_at day)
  const seen = new Set<string>();
  for (const row of rows) {
    const key =
      (row.email && `e:${row.email.toLowerCase()}`) ||
      (row.phone && `p:${row.phone}`) ||
      (row.name &&
        `n:${row.name.toLowerCase()}@${new Date(row.created_at).toISOString().slice(0, 10)}`) ||
      `id:${row.id}`;
    seen.add(key);
  }
  const uniqueClients = seen.size;

  return NextResponse.json({ submissions, uniqueClients });
}
