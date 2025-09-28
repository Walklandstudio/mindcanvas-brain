import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type Frequency = 'A' | 'B' | 'C' | 'D';

type SubmissionRow = {
  id: string;
  created_at: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  test_slug?: string | null; // optional if your schema doesn't have it
};

type RawRecord = Record<string, unknown>;

function okSlug(u: unknown): string | null {
  return typeof u === 'string' && u.trim() ? u.trim() : null;
}
function pickString(obj: RawRecord, keys: string[], fallback = ''): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return fallback;
}
function pickNumber(obj: RawRecord, keys: string[], fallback = 0): number {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return fallback;
}
function pickBoolean(obj: RawRecord, keys: string[], fallback = true): boolean {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'boolean') return v;
  }
  return fallback;
}

/** Create the submission; retry without test_slug if that column doesn't exist. */
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

/** Load questions and options with ultra-compatible queries (no embedded relations). */
async function loadQuestionsAndOptions(slug: string) {
  // 1) Questions: select * and map defensively.
  const baseQ = supabaseAdmin.from('mc_questions').select('*');

  // Try filter by test_slug; if the column is missing, fall back to no filter
  const tryWith = await baseQ.eq('test_slug', slug);
  let qRows: RawRecord[] = [];
  if (tryWith.error) {
    if (/test_slug/i.test(tryWith.error.message)) {
      const noFilter = await supabaseAdmin.from('mc_questions').select('*');
      if (noFilter.error) throw new Error(`mc_questions query failed: ${noFilter.error.message}`);
      qRows = (noFilter.data ?? []) as RawRecord[];
    } else {
      throw new Error(`mc_questions query failed: ${tryWith.error.message}`);
    }
  } else {
    qRows = (tryWith.data ?? []) as RawRecord[];
  }

  if (!qRows.length) {
    throw new Error(
      `No questions found. Seed mc_questions/mc_options or use a valid slug (e.g. "competency-coach-dna").`,
    );
  }

  // 2) Options: fetch by question_id so we don't rely on PostgREST relations
  const ids = qRows
    .map((r) => (typeof r.id === 'string' ? r.id : null))
    .filter((x): x is string => !!x);

  const optRes = ids.length
    ? await supabaseAdmin
        .from('mc_options')
        .select('id, label, points, profile_code, frequency, question_id')
        .in('question_id', ids)
    : { data: [] as RawRecord[], error: null };

  if (optRes.error) {
    throw new Error(`mc_options query failed: ${optRes.error.message}`);
  }

  // Group options by question_id
  const byQ = new Map<string, Array<{
    id: string;
    label: string;
    points: number | null;
    profileCode: string | null;
    frequency: Frequency | null;
  }>>();

  for (const r of (optRes.data ?? []) as RawRecord[]) {
    const qid = typeof r.question_id === 'string' ? r.question_id : '';
    if (!qid) continue;
    const arr = byQ.get(qid) ?? [];
    arr.push({
      id: String(r.id),
      label: typeof r.label === 'string' ? r.label : '',
      points: typeof r.points === 'number' ? r.points : null,
      profileCode: typeof r.profile_code === 'string' ? r.profile_code : null,
      frequency:
        r.frequency === 'A' ||
        r.frequency === 'B' ||
        r.frequency === 'C' ||
        r.frequency === 'D'
          ? (r.frequency as Frequency)
          : null,
    });
    byQ.set(qid, arr);
  }

  // Map questions
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

  // Stable sort: by index, then text
  mapped.sort((a, b) => a.index - b.index || a.text.localeCompare(b.text));

  return mapped;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
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
    // Always send a body so your red banner can show it
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, info: 'POST { slug } to create a submission.' });
}
