import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Freq = 'A' | 'B' | 'C' | 'D' | null;
type Row = Record<string, unknown>;

function numFrom(row: Row, keys: string[]): number | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}
const str = (row: Row, key: string) =>
  typeof row[key] === 'string' ? (row[key] as string) : row[key] == null ? null : String(row[key]);
const freq = (row: Row, key: string): Freq => {
  const v = str(row, key);
  return v === 'A' || v === 'B' || v === 'C' || v === 'D' ? v : null;
};
const qType = (row: Row): 'single' | 'multi' | 'info' => {
  const v = (str(row, 'type') ?? str(row, 'question_type') ?? str(row, 'qtype'))?.toLowerCase();
  return v === 'multi' || v === 'info' ? (v as 'multi' | 'info') : 'single';
};
const isTrue = (row: Row, key: string, fallback = true) => {
  const v = row[key];
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1';
  return fallback;
};
const ord = (row: Row) => numFrom(row, ['order_index', 'index', 'position']) ?? 0;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { slug?: string };
  const slug = body?.slug?.trim();
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

  // Test
  const { data: test, error: tErr } = await supabaseAdmin
    .from('mc_tests')
    .select('id, slug')
    .eq('slug', slug)
    .maybeSingle<{ id: string; slug: string }>();
  if (tErr || !test) {
    return NextResponse.json({ error: tErr?.message ?? 'Test not found' }, { status: 404 });
  }

  // Create submission
  const { data: sub, error: sErr } = await supabaseAdmin
    .from('mc_submissions')
    .insert({ test_id: test.id })
    .select('id')
    .single<{ id: string }>();
  if (sErr || !sub) {
    return NextResponse.json({ error: sErr?.message ?? 'Failed to create submission' }, { status: 500 });
  }

  // Questions (tolerant)
  const { data: qrowsRaw, error: qErr } = await supabaseAdmin
    .from('mc_questions')
    .select('*')
    .eq('test_id', test.id);
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  const qrows = (qrowsRaw ?? []) as Row[];
  qrows.sort((a, b) => ord(a) - ord(b) || String(a.id).localeCompare(String(b.id)));
  const qIds = qrows.map(r => String(r.id));

  // Options
  const optionsByQ: Record<string, Row[]> = {};
  if (qIds.length) {
    const { data: orowsRaw, error: oErr } = await supabaseAdmin
      .from('mc_options')
      .select('*')
      .in('question_id', qIds);
    if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });

    for (const o of (orowsRaw ?? []) as Row[]) {
      const qid = String(o.question_id);
      (optionsByQ[qid] ||= []).push(o);
    }
    for (const k of Object.keys(optionsByQ)) {
      optionsByQ[k].sort((a, b) => (str(a, 'label') ?? '').localeCompare(str(b, 'label') ?? ''));
    }
  }

  // Assemble payload
  const questions = qrows.map((r, i) => {
    const qid = String(r.id);
    const opts = (optionsByQ[qid] ?? []).map(o => ({
      id: String(o.id),
      label: str(o, 'label') ?? '',
      points: numFrom(o, ['points']),
      profileCode: str(o, 'profile_code'),
      frequency: freq(o, 'frequency'),
    }));

    return {
      id: qid,
      index: (numFrom(r, ['order_index', 'index', 'position']) ?? i + 1) as number,
      text: str(r, 'text') ?? '',
      type: qType(r),
      isScored: isTrue(r, 'is_scored', true),
      options: opts,
    };
  });

  return NextResponse.json({
    submissionId: sub.id,
    testSlug: test.slug,
    questions,
    answers: {},
    finished: false,
  });
}
