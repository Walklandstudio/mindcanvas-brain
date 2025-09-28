import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type SubmissionRow = {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

type ResultRow = {
  submission_id: string;
  profile_code: string | null;
  flow_a: number | null;
  flow_b: number | null;
  flow_c: number | null;
  flow_d: number | null;
};

type AnswerRow = {
  submission_id: string;
  question_id: string;
  option_id: string | null;
  value: unknown;
  selected: unknown;
};

type QuestionRow = {
  id: string;
  text: string;
};

type OptionRow = {
  id: string;
  label: string;
};

type AnswerDTO = {
  question_id: string;
  question: string;
  answers: string[];
};

type DetailPayload = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  profile_code: string | null;
  flow_a: number;
  flow_b: number;
  flow_c: number;
  flow_d: number;
  answers: AnswerDTO[];
};

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (value === null || value === undefined) return [];
  return [String(value)];
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // Submission
  const subRes = await supabaseAdmin
    .from('mc_submissions')
    .select('id, created_at, name, email, phone')
    .eq('id', id)
    .maybeSingle();

  if (subRes.error || !subRes.data) {
    return NextResponse.json({ error: subRes.error?.message ?? 'Not found' }, { status: 404 });
  }
  const sub = subRes.data as SubmissionRow;

  // Results
  const resRes = await supabaseAdmin
    .from('mc_results')
    .select('submission_id, profile_code, flow_a, flow_b, flow_c, flow_d')
    .eq('submission_id', id)
    .maybeSingle();

  const resRow = (resRes.data ?? null) as ResultRow | null;

  // Answers for this submission
  const ansRes = await supabaseAdmin
    .from('mc_answers')
    .select('submission_id, question_id, option_id, value, selected')
    .eq('submission_id', id);

  if (ansRes.error) {
    return NextResponse.json({ error: ansRes.error.message }, { status: 500 });
  }

  const answers = (ansRes.data ?? []) as AnswerRow[];

  // Collect question ids & option ids we need to hydrate
  const qIds = new Set<string>();
  const optIds = new Set<string>();

  for (const a of answers) {
    qIds.add(a.question_id);
    const payload = a.value ?? a.selected ?? a.option_id;
    toStringArray(payload).forEach((oid) => optIds.add(oid));
  }

  // Questions
  const qRes = qIds.size
    ? await supabaseAdmin.from('mc_questions').select('id, text').in('id', Array.from(qIds))
    : { data: [] as QuestionRow[], error: null };

  if (qRes.error) {
    return NextResponse.json({ error: qRes.error.message }, { status: 500 });
  }
  const qMap = new Map<string, string>(
    ((qRes.data ?? []) as QuestionRow[]).map((q) => [q.id, q.text]),
  );

  // Options (labels)
  const oRes = optIds.size
    ? await supabaseAdmin.from('mc_options').select('id, label').in('id', Array.from(optIds))
    : { data: [] as OptionRow[], error: null };

  if (oRes.error) {
    return NextResponse.json({ error: oRes.error.message }, { status: 500 });
  }
  const oMap = new Map<string, string>(
    ((oRes.data ?? []) as OptionRow[]).map((o) => [o.id, o.label]),
  );

  const answerDtos: AnswerDTO[] = answers.map((a) => {
    const raw = a.value ?? a.selected ?? a.option_id;
    const ids = toStringArray(raw);
    const labels = ids.map((oid) => oMap.get(oid) ?? oid);
    return {
      question_id: a.question_id,
      question: qMap.get(a.question_id) ?? '',
      answers: labels,
    };
  });

  const payload: DetailPayload = {
    id: sub.id,
    created_at: sub.created_at,
    name: sub.name ?? '',
    email: sub.email ?? '',
    phone: sub.phone ?? '',
    profile_code: resRow?.profile_code ?? null,
    flow_a: resRow?.flow_a ?? 0,
    flow_b: resRow?.flow_b ?? 0,
    flow_c: resRow?.flow_c ?? 0,
    flow_d: resRow?.flow_d ?? 0,
    answers: answerDtos,
  };

  return NextResponse.json(payload);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // Delete children first
  await supabaseAdmin.from('mc_answers').delete().eq('submission_id', id);
  await supabaseAdmin.from('mc_results').delete().eq('submission_id', id);

  const delRes = await supabaseAdmin.from('mc_submissions').delete().eq('id', id);
  if (delRes.error) {
    return NextResponse.json({ error: delRes.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
