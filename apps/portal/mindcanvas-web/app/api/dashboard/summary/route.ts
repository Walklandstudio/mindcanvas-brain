import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type SubRow = {
  id: string;
  created_at: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  test_slug?: string | null; // optional for installs without the column
};

function sinceDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function asString(u: unknown): string | null {
  return typeof u === 'string' ? u : null;
}
function asStringRequired(u: unknown, fallback = ''): string {
  return typeof u === 'string' ? u : fallback;
}
function toSubRow(rec: Record<string, unknown>): SubRow {
  return {
    id: asStringRequired(rec.id),
    created_at: asStringRequired(rec.created_at),
    email: asString(rec.email),
    name: asString(rec.name),
    phone: asString(rec.phone),
    // present only if your schema has it
    ...(Object.prototype.hasOwnProperty.call(rec, 'test_slug')
      ? { test_slug: asString(rec.test_slug) }
      : {}),
  };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const days = Number(sp.get('days') ?? '30');
  const slug = sp.get('slug') ?? undefined;

  const from = sinceDays(Number.isFinite(days) && days > 0 ? days : 30);

  // 1) Try with test_slug
  let rows: SubRow[] = [];
  const qWith = supabaseAdmin
    .from('mc_submissions')
    .select('id, created_at, email, name, phone, test_slug')
    .gte('created_at', from);

  const rWith =
    slug ? await qWith.eq('test_slug', slug) : await qWith;

  if (rWith.error && /test_slug/.test(rWith.error.message)) {
    // 2) Fallback without test_slug
    const rNo = await supabaseAdmin
      .from('mc_submissions')
      .select('id, created_at, email, name, phone')
      .gte('created_at', from);

    if (rNo.error) {
      return NextResponse.json({ error: rNo.error.message }, { status: 500 });
    }
    rows = (rNo.data ?? []).map((d) => toSubRow(d as Record<string, unknown>));
  } else if (rWith.error) {
    return NextResponse.json({ error: rWith.error.message }, { status: 500 });
  } else {
    rows = (rWith.data ?? []).map((d) => toSubRow(d as Record<string, unknown>));
  }

  // Submissions count
  const submissions = rows.length;

  // Unique clients: prefer email > phone > name+date > id
  const seen = new Set<string>();
  for (const r of rows) {
    const key =
      (r.email && `e:${r.email.toLowerCase()}`) ||
      (r.phone && `p:${r.phone}`) ||
      (r.name &&
        `n:${r.name.toLowerCase()}@${new Date(r.created_at).toISOString().slice(0, 10)}`) ||
      `id:${r.id}`;
    seen.add(key);
  }

  return NextResponse.json({ submissions, uniqueClients: seen.size });
}
