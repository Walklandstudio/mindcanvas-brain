import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { PostgrestResponse } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/* ---------- Helpers ---------- */

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

function okSlug(u: unknown): string | null {
  return typeof u === 'string' && u.trim() ? u.trim() : null;
}
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

/* ---------- Submission create (safe with/without test_slug) ---------- */

async function createSubmission(slug: string): Promise<SubmissionRow> {
  const withSlug = await supabaseAdmin
    .from('mc_submissions')
    .insert([{ test_slug: slug }])
    .select('id, created_at, name, email, phone, test_slug')
    .single<SubmissionRow>();

  if (withSlug.error) {
    if (/test_slug/i.test(withSlug.error.message)) {
      const noSlug = await supabaseAdmin
        .from('mc_submissions')
        .insert([{}])
        .select('id, created_at, name, email, phone')
        .single<SubmissionRow>();
      if (noSlug.error) throw new Error(`mc_submissions insert failed: ${noSlug.error.message}`);
      return noSlug.data as SubmissionRow;
    }
    throw new Error(`mc_submissions insert failed: ${withSlug.error.message}`);
  }
  return withSlug.data as SubmissionRow;
}

/* ---------- Load questions & options (explicit columns) ---------- */

async function loadQuestionsAndOptions(slug: string) {
  // Try to filter by test_slug; fall back if that column doesn't exist.
  const qTry = await supabaseAdmin.from('mc_questions').select('*').eq('test_slug', slug);
  let qRows: Raw[] = [];
  if (qTry.error) {
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

  // Collect question ids
  const qIds = qRows
    .map((r) => (typeof r.id === 'string' ? r.id : null))
    .filter((x): x is string => !!x);

  // Pull options explicitly with question_id / idx / label / points / profile_code / flow_code / flow
  let optionsData: Raw[] = [];
  if (qIds.length) {
    const oRes: PostgrestResponse<Raw> = await supabaseAdmin
      .from('mc_options')
      .select('id,question_id,idx,label,points,profile_code,flow_code,flow');

    if (!oRes.error) optionsData = (oRes.data ?? []) as Raw[];
    // (If options query errors, we still return questions without options so the page loads.)
  }

  // Group options by question_id
  const byQ = new Map<
    string,
    Array<{
      id: string;
      label: string;
      points: number | null;
      profileCode: string | null;
      frequency: Frequency | null;
      idx: number;
    }>
  >();

  for (const r of optionsData) {
    const qid = typeof r.question_id === 'string' ? r.question_id : '';
    if (!qid || !qIds.includes(qid)) continue;

    // Flow detection: prefer flow_code (A/B/C/D), else flow if it matches
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

  // Map question shape the UI expects
  const mapped = qRows.map((row) => {
    const id = String(row.id);
    const text = pickString(row, ['text', 'question', 'prompt', 'label'], 'Question');
    const index = pickNumber(row, ['order_index', 'index', 'order', 'position', 'sort', 'order_no'], 0);
    const type = pickString(row, ['type', 'question_type', 'q_type', 'kind'], 'single') as
      | 'single'
      | 'multi'
      | 'info';
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

  // Stable order
  mapped.sort((a, b) => a.index - b.index || a.text.localeCompare(b.text));
  return mapped;
}

/* ---------- Route handlers ---------- */

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Raw;
    const slug = okSlug(body?.slug) ?? 'competency-coach-dna';

    const submission = await createSubmission(slug);
    const questions = await loadQuestionsAndOptions(slug);

    return NextResponse.json({
      submissionId: submission.id,
      testSlug: slug,
      questions,
      answers: {},
      finished: false,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, info: 'POST { slug } to create a submission.' });
}


