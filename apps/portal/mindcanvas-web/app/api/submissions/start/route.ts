import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { PostgrestResponse } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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

/** Create submission; retry without test_slug if that column doesn't exist. */
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

/** Ultra-tolerant: read questions only, no options, no slug filtering. */
async function loadQuestionsSuperSafe() {
  const qRes: PostgrestResponse<Raw> = await supabaseAdmin.from('mc_questions').select('*');
  if (qRes.error) {
    throw new Error(`mc_questions query failed: ${qRes.error.message ?? 'unknown error'}`);
  }
  const rows = (qRes.data ?? []) as Raw[];
  if (!rows.length) {
    throw new Error(`No questions found in mc_questions.`);
  }

  const mapped = rows.map((row) => {
    const id = String(row.id);
    const text = pickString(row, ['text', 'question', 'prompt', 'label'], 'Question');
    const index = pickNumber(row, ['order_index', 'index', 'order', 'position', 'sort', 'order_no'], 0);
    const type = pickString(row, ['type', 'question_type', 'q_type', 'kind'], 'single') as
      | 'single'
      | 'multi'
      | 'info';
    const isScored = pickBoolean(row, ['is_scored', 'scored'], true);
    return { id, index, text, type, isScored, options: [] as Array<never> };
  });

  // keep order stable even if order_index is missing
  mapped.sort((a, b) => a.index - b.index || a.text.localeCompare(b.text));
  return mapped;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Raw;
    const slug = okSlug(body?.slug) ?? 'competency-coach-dna';

    const submission = await createSubmission(slug);
    const questions = await loadQuestionsSuperSafe();

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


