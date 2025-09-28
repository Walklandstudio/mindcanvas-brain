import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/** Row shape we normalize to (test_slug optional for installs without the column). */
type SubRow = {
  created_at: string;
  test_slug?: string | null;
};

function sinceDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function fmtDay(d: Date): string {
  // yyyy-mm-dd
  return d.toISOString().slice(0, 10);
}

/** Narrow unknown record to our SubRow safely. */
function toRow(rec: Record<string, unknown>): SubRow {
  const created_at =
    typeof rec.created_at === 'string' ? rec.created_at : new Date().toISOString();

  const out: SubRow = { created_at };

  if (Object.prototype.hasOwnProperty.call(rec, 'test_slug')) {
    out.test_slug = typeof rec.test_slug === 'string' ? rec.test_slug : null;
  }
  return out;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const days = Number(sp.get('days') ?? '30');
  const slug = sp.get('slug') ?? undefined;

  const windowDays = Number.isFinite(days) && days > 0 ? days : 30;
  const from = sinceDays(windowDays);

  // --- Attempt 1: query including test_slug (if present) ---
  let withErr: string | null = null;
  let rows: SubRow[] = [];

  {
    let q = supabaseAdmin
      .from('mc_submissions')
      .select('created_at, test_slug')
      .gte('created_at', from);

    if (slug) q = q.eq('test_slug', slug);

    const r = await q;

    if (r.error) {
      // If the error is about the test_slug column missing, fall back.
      if (/test_slug/.test(r.error.message)) {
        withErr = r.error.message;
      } else {
        return NextResponse.json({ error: r.error.message }, { status: 500 });
      }
    } else {
      rows = (r.data ?? []).map((d) => toRow(d as Record<string, unknown>));
    }
  }

  // --- Attempt 2: fallback without test_slug column ---
  if (withErr) {
    const rNo = await supabaseAdmin
      .from('mc_submissions')
      .select('created_at')
      .gte('created_at', from);

    if (rNo.error) {
      return NextResponse.json({ error: rNo.error.message }, { status: 500 });
    }
    rows = (rNo.data ?? []).map((d) => toRow(d as Record<string, unknown>));
  }

  // Build day buckets across the window
  const buckets = new Map<string, number>();
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    buckets.set(fmtDay(d), 0);
  }

  for (const row of rows) {
    const key = fmtDay(new Date(row.created_at));
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  const series = Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
  return NextResponse.json({ series });
}
