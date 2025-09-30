import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { PostgrestResponse } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

type Raw = Record<string, unknown>;
type Frequency = 'A' | 'B' | 'C' | 'D';

type SubmissionRow = {
  id: string;
  created_at: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  test_slug?: string | null;
};

function pickString(obj: Raw, keys: string[], fallback = ''): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return fallback;
}
function pickNumber(obj: Raw, keys: string[], fallback = 0): number {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return fallback;
}
function pickBoolean(obj: Raw, keys: string[], fallback = true): boolean {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'boolean') return v;
  }
  return fallback;
}

/* ---------- Questions + options loader (uses your mc_options schema) ---------- */

async function loadQuestionsAndOptions(slug: string | null) {
  // Try filtering by test_slug if present; otherwise read all questions.
  const qTry = slug
    ? await supabaseAdmin.from('mc_questions').select('*').eq('test_slug', slug)
    : await supabaseAdmin.from('mc_questions').select('*');

  let qRows: Raw[] = [];
  if (qTry.error) {
    // If test_slug column doesn't exist, fallback to all
    if (/test_slug/i.test(qTry.error.message)) {
      const qAll: PostgrestResponse<Raw> = await supabaseAdmin.from('mc_questions').select('*');
      if (qAll.error) throw new Error(`mc_questions query failed: ${qAll.error.message}`);
      qRows = (qAll.data ?? []) as Raw[];
    } else {
      throw new Error(`mc_questions query failed: ${qTry.error.message}`);
    }
  } else {
    qRows = (qTry.data ?? []) as Raw[];
  }
  if (!qRows.length) throw new Error('No questions found in mc_questions.');

  const qIds = qRows
    .map((r) => (typeof r.id === 'string' ? r.id : null))
    .filter((x): x is string => !!x);

  // Pull options with explicit columns: question_id/idx/label/points/profile_code/flow_code/flow
  let optionsData: Raw[] = [];
  if (qIds.length) {
    const oRes: PostgrestResponse<Raw> = await supabaseAdmin
      .from('mc_options')
      .select('id,question_id,idx,label,points,profile_code,flow_code,flow');
    if (!oRes.error) optionsData = (oRes.data ?? []) as Raw[];
  }

  const byQ = new Map<
    string,
    Array<{ id: string; label: string; points: number | null; profileCode: string | null; frequency: Frequency | null; idx: number }>
  >();

  for (const r of optionsData) {
    const qid = typeof r.question_id === 'string' ? r.question_id : '';
    if (!qid || !qIds.includes(qid)) continue;

    let freq: Frequency | null = null;
    const fc = typeof r.flow_code === 'string' ? r.flow_code : null;
    const ftxt = typeof r.flow === 'string' ? r.flow : null;
    if (fc === 'A' || fc === 'B' || fc === 'C' || fc === 'D') freq = fc;
    else if (ftxt === 'A' || ftxt === 'B' || ftxt === 'C' || ftxt === 'D') freq = ftxt;

    const item = {
      id: String(r.id),
      label: typeof r.label === 'string' ? r.label : '',
      points: typeof r.points === 'number' ? r.points : null,
      profileCode: typeof r.profile_code === 'string' ? r.profile_code : null,
      frequency: freq,
      idx: typeof r.idx === 'number' && Number.isFinite(r.idx) ? r.idx : 0,
    };
    const arr = byQ.get(qid) ?? [];
    arr.push(item);
    byQ.set(qid, arr);
  }

  const mapped = qRows.map((row) => {
    const id = String(row.id);
    const text = pickString(row, ['text', 'question', 'prompt', 'label'], 'Question');
    const index = pickNumber(row, ['order_index', 'index', 'order', 'position', 'sort', 'order_no'], 0);
    const type = pickString(row, ['type', 'question_type', 'q_type', 'kind'], 'single') as 'single' | 'multi' | 'info';
    const isScored = pickBoolean(row, ['is_scored', 'scored'], true);

    const options = (byQ.get(id) ?? []).sort((a, b) => a.idx - b.idx || a.label.localeCompare(b.label));

    return {
      id,
      index,
      text,
      type,
      isScored,
      options: options.map((o) => ({
        id: o.id,
        label: o.label,
        points: o.points,
        profileCode: o.profileCode,
        frequency: o.frequency,
      })),
    };
  });

  mapped.sort((a, b) => a.index - b.index || a.text.localeCompare(b.text));
  return mapped;
}

/* ---------- Answers loader (tolerant to column names) ---------- */

function findQuestionId(r: Raw): string | null {
  const candidates = ['question_id', 'questionId', 'q_id', 'question', 'qid'];
  for (const k of candidates) {
    const v = r[k];
    if (typeof v === 'string' && v) return v;
  }
  return null;
}
function extractAnswerValue(r: Raw): string | string[] | undefined {
  // prefer option_id / selected / value / choice
  const singleKeys = ['option_id', 'optionId', 'selected', 'value', 'choice'];
  for (const k of singleKeys) {
    const v = r[k];
    if (typeof v === 'string' && v) return v;
    if (Array.isArray(v) && v.length && v.every((x) => typeof x === 'string')) return v as string[];
  }
  return undefined;
}

async function loadAnswers(submissionId: string): Promise<Record<string, string | string[]>> {
  const aRes: PostgrestResponse<Raw> = await supabaseAdmin
    .from('mc_answers')
    .select('*')
    .eq('submission_id', submissionId);

  if (aRes.error) {
    // Don’t crash the test — just return empty answers
    return {};
  }

  const map: Record<string, string | string[]> = {};
  for (const r of (aRes.data ?? []) as Raw[]) {
    const qid = findQuestionId(r);
    if (!qid) continue;
    const val = extractAnswerValue(r);
    if (val === undefined) continue;
    map[qid] = val;
  }
  return map;
}

/* ---------- GET /api/submissions/[id] ---------- */

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;

    const s = await supabaseAdmin
      .from('mc_submissions')
      .select('id, created_at, name, email, phone, test_slug')
      .eq('id', id)
      .single<SubmissionRow>();

    if (s.error) {
      return NextResponse.json({ error: s.error.message }, { status: 404 });
    }

    const slug = (s.data?.test_slug ?? null) as string | null;
    const questions = await loadQuestionsAndOptions(slug);
    const answers = await loadAnswers(id);

    return NextResponse.json({
      submissionId: id,
      testSlug: slug ?? 'competency-coach-dna',
      questions,
      answers,
      finished: false, // use true if you add a column later
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/* ---------- PATCH /api/submissions/[id] (save details) ---------- */

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as Raw;

    const name = pickString(body, ['name'], '');
    const email = pickString(body, ['email'], '');
    const phone = pickString(body, ['phone'], '');

    const upd = await supabaseAdmin
      .from('mc_submissions')
      .update({ name, email, phone })
      .eq('id', id)
      .select('id, name, email, phone')
      .single();

    if (upd.error) {
      return NextResponse.json({ error: upd.error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, submissionId: id, person: upd.data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
