import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type OptionRow = {
  id: string;
  label: string;
  points: number | null;
  profile_code: string | null;
  frequency: 'A' | 'B' | 'C' | 'D' | null;
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
  // test_slug is optional (some installs don’t have it)
  test_slug?: string | null;
};

function okSlug(u: unknown): string | null {
  return typeof u === 'string' && u.trim() ? u.trim() : null;
}

/**
 * Load questions + options for a test slug.
 * Falls back gracefully if no rows are found.
 */
async function loadQuestions(slug: string) {
  // If your mc_questions table stores slug, filter by it. If not, remove .eq('test_slug', slug)
  let q = supabaseAdmin
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

  // Try to filter by test_slug if that column exists in mc_questions
  const resTry = await q.eq('test_slug', slug);
  if (resTry.error && /test_slug/.test(resTry.error.message)) {
    // Column doesn't exist on mc_questions — run again without the filter
    const resNo = await q;
    if (resNo.error) throw new Error(resNo.error.message);
    return (resNo.data ?? []) as QuestionRow[];
  }
  if (resTry.error) throw new Error(resTry.error.message);
  return (resTry.data ?? []) as QuestionRow[];
}

/**
 * Create an empty submission and return it.
 * Tries to set test_slug if the column exists; otherwise retries without it.
 */
async function createSubmission(slug: string): Promise<SubmissionRow> {
  // Attempt with test_slug
  const insWith = await supabaseAdmin
    .from('mc_submissions')
    .insert([{ test_slug: slug }])
    .select('id, created_at, name, email, phone, test_slug')
    .single<SubmissionRow>();

  if (insWith.error) {
    if (/test_slug/.test(insWith.error.message)) {
      // Retry without the column
      const insNo = await supabaseAdmin
        .from('mc_submissions')
        .insert([{}])
        .select('id, created_at, name, email, phone')
        .single<SubmissionRow>();

      if (insNo.error) throw new Error(insNo.error.message);
      return insNo.data as SubmissionRow;
    }
    throw new Error(insWith.error.message);
  }

  return insWith.data as SubmissionRow;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const rawSlug = body?.slug;
    // Pick provided slug or your known default
    const slug = okSlug(rawSlug) ?? 'competency-coach-dna';

    // 1) Create the submission row
    const submission = await createSubmission(slug);

    // 2) Load questions for the slug (or all if mc_questions has no test_slug column)
    const questions = await loadQuestions(slug);

    // Normalize question fields to the shape your TestClient expects
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

    // 3) Return the payload your Test page uses
    return NextResponse.json({
      submissionId: submission.id,
      testSlug: slug,
      questions: normalized,
      answers: {}, // start empty
      finished: false,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Optional GET for easy manual checks (not required by your Test page)
export async function GET() {
  return NextResponse.json({ ok: true, info: 'POST a JSON body { slug } to start a submission.' });
}
