import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { PostgrestResponse } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type Frequency = 'A' | 'B' | 'C' | 'D';
type Raw = Record<string, unknown>;

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

/** Create submission; retry without test_slug if the column doesn't exist. */
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

function detectOptionFK(row: Raw): string | null {
  const candidates = [
    'question_id',
    'questionId',
    'q_id',
    'mc_question_id',
    'question',
    'question_uuid',
    'qid',
  ];
  for (const k of candidates) if (k in row) return k;
  return null;
}

/** Load questions + options without assuming column names. */
async function loadQuestionsAndOptions(slug: string) {
  // QUESTIONS
  const tryWith = await supabaseAdmin.from('mc_questions').select('*').eq('test_slug', slug);
  let qRows: Raw[] = [];
  if (tryWith.error) {
    if (/test_slug/i.test(tryWith.error.message)) {
      const noFilter = await supabaseAdmin.from('mc_questions').select('*');
      if (noFilter.error) throw new Error(`mc_questions query failed: ${noFilter.error.message}`);
      qRows = (noFilter.data ?? []) as Raw[];
    } else {
      throw new Error(`mc_questions query failed: ${tryWith.error.message}`);
    }
  } else {
    qRows = (tryWith.data ?? []) as Raw[];
  }
  if (!qRows.length) {
    throw new Error(
      `No questions found. Seed mc_questions/mc_options or use a valid slug (e.g. "competency-coach-dna").`,
    );
  }

  // OPTIONS (select *; detect the FK name; then group by it)
  let optionsData: Raw[] = [];
  if (qRows.length) {
    const optRes: PostgrestResponse<Raw> = await supabaseAdmin.from('mc_options').select('*');
    if (optRes.error) {
      throw new Error(`mc_options query failed: ${optRes.error.message ?? 'unknown error'}`);
    }
    optionsData = (optRes.data ?? []) as Raw[];
  }

  // Detect FK name (from first row that has any of the candidates)
  let fkName: string | null = null;
  for (const r of optionsData) {
    fkName = detectOptionFK(r);
    if (fkName) break;
  }
  if (!fkName && optionsData.length) {
    throw new Error(
      `Could not detect the question foreign key on mc_options (looked for question_id, questionId, q_id, mc_question_id, question, question_uuid, qid).`,
    );
  }

  // Build set of question IDs to filter options client-side
  const qIdSet = new Set(
    qRows
      .map((r) => (typeof r.id === 'string' ? r.id : null))
      .filter((x): x is string => !!x),
  );

  const byQ = new Map<
    string,
    Array<{ id: string; label: string; points: number | null; profileCode: string | null; frequency: Frequency | null }>
  >();

  if (fkName) {
    for (const r of optionsData) {
      const qrefRaw = r[fkName];
      const qref =
        typeof qrefRaw === 'string'
          ? qrefRaw
          : typeof qrefRaw === 'number'
          ? String(qrefRaw)
          : '';
      if (!qref || !qIdSet.has(qref)) continue;

      const opt = {
        id: String(r.id),
        label: typeof r.label === 'string' ? r.label : '',
        points: typeof r.points === 'number' ? r.points : null,
        profileCode: typeof r.profile_code === 'string' ? r.profile_code : null,
        frequency:
          r.frequency === 'A' || r.frequency === 'B' || r.frequency === 'C' || r.frequency === 'D'
            ? (r.frequency as Frequency)
            : null,
      };
      const arr = byQ.get(qref) ?? [];
      arr.push(opt);
      byQ.set(qref, arr);
    }
  }

  // Map to frontend shape
  const mapped = qRows.map((row) => {
    const id = String(row.id);
    const text = pickString(row, ['text', 'question', 'prompt', 'label'], 'Question');
    const index = pickNumber(row, ['order_index', 'index', 'order', 'position', 'sort', 'order_no'], 0);
    const type = pickString(row, ['type', 'question_type', 'q_type', 'kind'], 'single') as
      | 'single'
      | 'multi'
      | 'info';
    const isScored = pickBoolean(row, ['is_scored', 'scored'], true);
    const options = byQ.get(id) ?? [];
    return { id, index, text, type, isScored, options };
  });

  mapped.sort((a, b) => a.index - b.index || a.text.localeCompare(b.text));
  return mapped;
}

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
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, info: 'POST { slug } to create a submission.' });
}
