import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Flow = { A: number; B: number; C: number; D: number };
type AnswerRow = { question: string | null; selected: unknown };

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // Submission
  const { data: sub, error: subErr } = await supabaseAdmin
    .from('mc_submissions')
    .select('id, created_at, report_id, person_id')
    .eq('id', id)
    .single();

  if (subErr || !sub) {
    return NextResponse.json({ error: subErr?.message || 'Not found' }, { status: 404 });
  }

  // Person
  const { data: person } = await supabaseAdmin
    .from('mc_people')
    .select('name, email, phone')
    .eq('id', sub.person_id)
    .maybeSingle();

  // Result
  const { data: result } = await supabaseAdmin
    .from('mc_results')
    .select('profile_code, flow_a, flow_b, flow_c, flow_d')
    .eq('submission_id', sub.id)
    .maybeSingle();

  // Answers
  const { data: answersRaw } = await supabaseAdmin
    .from('mc_answers')
    .select('question, selected')
    .eq('submission_id', sub.id)
    .order('question', { ascending: true });

  const flow: Flow | null = result
    ? {
        A: Number(result.flow_a ?? 0),
        B: Number(result.flow_b ?? 0),
        C: Number(result.flow_c ?? 0),
        D: Number(result.flow_d ?? 0),
      }
    : null;

  const answers = (answersRaw as AnswerRow[] | null | undefined)?.map((a) => ({
    question: String(a.question ?? ''),
    selected: Array.isArray(a.selected)
      ? (a.selected as unknown[]).map((x) => String(x))
      : typeof a.selected === 'string'
        ? a.selected
        : JSON.stringify(a.selected ?? ''),
  })) ?? [];

  return NextResponse.json({
    id: sub.id,
    created_at: sub.created_at,
    report_id: sub.report_id ?? null,
    name: person?.name ?? null,
    email: person?.email ?? null,
    phone: person?.phone ?? null,
    profile_code: result?.profile_code ?? null,
    flow,
    answers,
  });
}
