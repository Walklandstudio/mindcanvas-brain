import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Frequency = 'A' | 'B' | 'C' | 'D';

type OptionRow = {
  id: string;
  label: string;
  points: number | null;
  profile_code: string | null;
  frequency: Frequency | null;
};

type QuestionRow = {
  id: string;
  order_index: number;
  text: string;
  type: 'single' | 'multi' | 'info';
  is_scored: boolean;
  options: OptionRow[];
};

type SubmissionRow = {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  test_slug?: string | null; // optional (schema might not have this)
};

function okSlug(u: unknown): string | null {
  return typeof u === 'string' && u.trim() ? u.trim() : null;
}

/** Load questions (tries to filter by test_slug; falls back if that column doesn't exist). */
async function loadQuestions(slug: string): Promise<QuestionRow[]> {
  const baseQ = supabaseAdmin
    .from('mc_questions')
    .select(
      `
      id,
      order_index,
      text,
      type,
      is_scored,
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

  if (tryWith.error) {
    // If mc_questions.test_slug is missing, run without the filter
    if (/test_slug/.test(tryWith.error.message)) {
      const noFilter = await baseQ;
      if (noFilter.error) throw new Error(noFilter.error.message);
      return (noFilter.data ?? []) as QuestionRow[];
    }
    throw new Error(tryWith.error.message);
  }

  return (tryWith.data ?? []) as QuestionRow[];
}

/** Create a submission; if mc_submissions.test_slug doesn't exist, retry without it. */
async function createSubmission(slug: string): Promise<SubmissionRow> {
  const withSlug = await supabaseAdmin
    .from('mc_submissions')
    .insert([{ test_slug: slug }])
    .select('id, created_at, name, email, phone, test_slug')
    .single<SubmissionRow>();

  if (withSlug.error) {
    if (/test_slug/.test(withSlug.error.message)) {
      const noSlug = await supabaseAdmin
        .from('mc_submissions')
        .insert([{}])
        .select('id, created_at, name, email, phone')
        .single<SubmissionRow>();
      if (noSlug.error) throw new Error(noSlug.error.message);
      return noSlug.data as SubmissionRow;
    }
    throw new Error(withSlug.error.message);
  }

  return withSlug.data as SubmissionRow;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const rawSlug = body?.slug;
    const slug = okSlug(rawSlug) ?? 'competency-coach-dna';

    // 1) Create submission (with fallback if test_slug column missing)
    const submission = await createSubmission(slug);

    // 2) Load questions for the slug (or all if mc_questions has no test_slug)
    const questions = await loadQuestions(slug);

    // 3) Normalize to the shape your Test page expects
    const normalized = questions.map((q) => ({
      id: q.id,
      index: q.order_index,
      text: q.text,
      type: q.type,
      isScored: !!q.is_scored,
      options: (q.options ?? []).map((o) => ({
        id: o.id,
        label: o.label,
        points: o.points,
        profileCode: o.profile_code,
        frequency: o.frequency,
      })),
    }));

    return NextResponse.json({
      submissionId: submission.id,
      testSlug: slug,
      questions: normalized,
      answers: {},
      finished: false,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Optional GET so you can ping the endpoint quickly if needed.
export async function GET() {
  return NextResponse.json({ ok: true, info: 'POST a JSON body { slug } to start a submission.' });
}
