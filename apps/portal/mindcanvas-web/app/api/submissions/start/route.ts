import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/** Force runtime to execute on every request (no caching). */
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
  created_at: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  test_slug?: string | null; // optional if your schema doesn't have it
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
    if (/test_slug/i.test(tryWith.error.message)) {
      const noFilter = await baseQ;
      if (noFilter.error) throw new Error(`mc_questions query failed: ${noFilter.error.message}`);
      return (noFilter.data ?? []) as QuestionRow[];
    }
    throw new Error(`mc_questions query failed: ${tryWith.error.message}`);
  }
  return (tryWith.data ?? []) as QuestionRow[];
}

/** Create submission; if mc_submissions.test_slug doesn't exist, retry without it. */
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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const rawSlug = body?.slug;
    const slug = okSlug(rawSlug) ?? 'competency-coach-dna';

    // Create the submission row
    const submission = await createSubmission(slug);

    // Load questions
    const questions = await loadQuestions(slug);
    if (!questions.length) {
      // Be explicit so the UI shows something useful
      throw new Error(
        `No questions found for slug "${slug}". Seed mc_questions (and mc_options) or use a slug that exists.`,
      );
    }

    // Normalize to the Test page schema
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
    // Always return a clear error string for the red banner
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Handy ping for quick checks in the browser. */
export async function GET() {
  return NextResponse.json({ ok: true, info: 'POST { slug } to create a submission.' });
}
