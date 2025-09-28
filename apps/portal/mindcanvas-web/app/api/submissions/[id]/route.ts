import { NextResponse } from 'next/server';
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
function str(row: Row, key: string): string | null {
  const v = row[key];
  return typeof v === 'string' ? v : v == null ? null : String(v);
}
function freq(row: Row, key: string): Freq {
  const v = str(row, key);
  return v === 'A' || v === 'B' || v === 'C' || v === 'D' ? v : null;
}
function qType(row: Row): 'single' | 'multi' | 'info' {
  const v = (str(row, 'type') ?? str(row, 'question_type') ?? str(row, 'qtype'))?.toLowerCase();
  return v === 'multi' || v === 'info' ? (v as 'multi' | 'info') : 'single';
}
function isTrue(row: Row, key: string, fallback = true): boolean {
  const v = row[key];
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1';
  return fallback;
}
function orderValue(row: Row): number {
  return numFrom(row, ['order_index', 'index', 'position']) ?? 0;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // Submission → test_id
  const { data: sub, error: subErr } = await supabaseAdmin
    .from('mc_submissions')
    .select('id, test_id')
    .eq('id', id)
    .maybeSingle<{ id: string; test_id: string | null }>();
  if (subErr || !sub?.test_id) {
    return NextResponse.json(
      { error: subErr?.message ?? 'Submission not found or missing test_id' },
      { status: 404 },
    );
  }

  // Test slug (for display)
  let testSlug = 'test';
  const { data: trow } = await supabaseAdmin
    .from('mc_tests')
    .select('slug')
    .eq('id', sub.test_id)
    .maybeSingle<{ slug: string }>();
  if (trow?.slug) testSlug = trow.slug;

  // Questions (tolerant: select all, sort in code)
  const { data: qrowsRaw, error: qErr } = await supabaseAdmin
    .from('mc_questions')
    .select('*')
    .eq('test_id', sub.test_id);
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  const qrows = (qrowsRaw ?? []) as Row[];
  qrows.sort((a, b) => orderValue(a) - orderValue(b) || String(a.id).localeCompare(String(b.id)));
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

  // Answers
  const { data: arows, error: aErr } = await supabaseAdmin
    .from('mc_answers')
    .select('question_id, selected')
    .eq('submission_id', sub.id);
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

  const answers: Record<string, string | string[] | undefined> = {};
  for (const a of arows ?? []) {
    const key = String((a as Row).question_id);
    const sel = (a as Row).selected;
    answers[key] = Array.isArray(sel)
      ? (sel as ReadonlyArray<unknown>).map(x => String(x))
      : typeof sel === 'string'
        ? sel
        : undefined;
  }

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
    testSlug,
    questions,
    answers,
    finished: false,
  });
}
