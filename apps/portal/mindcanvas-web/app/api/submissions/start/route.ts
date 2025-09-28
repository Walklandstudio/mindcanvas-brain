import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type Frequency = 'A' | 'B' | 'C' | 'D';

type OptionRow = {
  id: string;
  label: string;
  points: number | null;
  profile_code: string | null;
  frequency: Frequency | null;
};

type RawQuestion = Record<string, unknown>;

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

function pickString(obj: RawQuestion, keys: string[], fallback = ''): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return fallback;
}
function pickNumber(obj: RawQuestion, keys: string[], fallback = 0): number {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return fallback;
}
function pickBoolean(obj: RawQuestion, keys: string[], fallback = true): boolean {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'boolean') return v;
  }
  return fallback;
}

/** Create submission; if mc_submissions.test_slug is missing, retry without it. */
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

/** Load questions; tolerate missing columns by selecting * and mapping. */
async function loadQuestions(slug: string) {
  // Try with mc_questions.test_slug; if absent, fall back to no filter
  const baseQ = supabaseAdmin
    .from('mc_questions')
    .select(
      `
      *,
      options:mc_options(
        id,
        label,
        points,
        profile_code,
        frequency
      )
    `,
    )
    .order('order_index', { ascending: true });

  const tryWith = await baseQ.eq('test_slug', slug);

  let data: RawQuestion[] = [];
  if (tryWith.error) {
    if (/test_slug/i.test(tryWith.error.message)) {
      const noFilter = await baseQ;
      if (noFilter.error) throw new Error(`mc_questions query failed: ${noFilter.error.message}`);
      data = (noFilter.data ?? []) as RawQuestion[];
    } else {
      throw new Error(`mc_questions query failed: ${tryWith.error.message}`);
    }
  } else {
    data = (tryWith.data ?? []) as RawQuestion[];
  }

  if (!data.length) {
    throw new Error(
      `No questions found. Seed mc_questions/mc_options or use an existing slug (e.g. "competency-coach-dna").`,
    );
  }

  // Map to the TestClient shape defensively
  const qs = data.map((row) => {
    const id = pickString(row, ['id']);
    const text = pickString(row, ['text', 'question', 'prompt', 'label'], 'Question');
    const index = pickNumber(row, ['order_index', 'index', 'order', 'position', 'sort', 'order_no'], 0);
    const type = pickString(row, ['type', 'question_type', 'q_type', 'kind'], 'single') as
      | 'single'
      | 'multi'
      | 'info';
    const isScored = pickBoolean(row, ['is_scored', 'scored'], true);

    const options = Array.isArray(row.options)
      ? (row.options as OptionRow[]).map((o) => ({
          id: o.id,
          label: o.label,
          points: o.points,
          profileCode: o.profile_code,
          frequency: o.frequency,
        }))
      : [];

    return { id, index, text, type, isScored, options };
  });

  // Ensure a stable order if order_index wasn’t present
  qs.sort((a, b) => a.index - b.index || a.text.localeCompare(b.text));
  return qs;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const rawSlug = body?.slug;
    const slug = okSlug(rawSlug) ?? 'competency-coach-dna';

    const submission = await createSubmission(slug);
    const questions = await loadQuestions(slug);

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
