import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const { data: sub, error: sErr } = await supabaseAdmin
    .from('mc_submissions')
    .select('id, created_at, name, email, phone')
    .eq('id', id)
    .maybeSingle();

  if (sErr || !sub) return NextResponse.json({ error: sErr?.message ?? 'Not found' }, { status: 404 });

  const { data: res } = await supabaseAdmin
    .from('mc_results')
    .select('profile_code, flow_a, flow_b, flow_c, flow_d')
    .eq('submission_id', id)
    .maybeSingle();

  // answers + question text + option labels (best effort for multi/single)
  const { data: answers } = await supabaseAdmin
    .from('mc_answers')
    .select('question_id, option_id, value, selected');

  const chosen = (answers ?? []).filter((a) => a && (a as any).question_id && (a as any).submission_id === id);

  // hydrate with question & option text
  const qIds = [...new Set(chosen.map((a: any) => a.question_id))];
  const { data: qs } = await supabaseAdmin
    .from('mc_questions')
    .select('id, text')
    .in('id', qIds as string[]);

  const qText = new Map((qs ?? []).map((q: any) => [q.id, q.text]));

  // We’ll pull all option ids we see in answers
  const optIds: string[] = [];
  for (const a of chosen as any[]) {
    const payload = a.value ?? a.selected ?? a.option_id ?? null;
    if (Array.isArray(payload)) payload.forEach((v: any) => optIds.push(String(v)));
    else if (payload != null) optIds.push(String(payload));
  }
  const uniqueOptIds = [...new Set(optIds)];
  const { data: opts } = uniqueOptIds.length
    ? await supabaseAdmin.from('mc_options').select('id, label').in('id', uniqueOptIds)
    : { data: [] as any[] };

  const optLabel = new Map((opts ?? []).map((o: any) => [String(o.id), o.label as string]));

  const answerDtos = (chosen as any[]).map((a) => {
    const payload = a.value ?? a.selected ?? a.option_id ?? null;
    const labels: string[] = Array.isArray(payload)
      ? (payload as any[]).map((x) => optLabel.get(String(x)) ?? String(x))
      : payload != null
        ? [optLabel.get(String(payload)) ?? String(payload)]
        : [];
    return {
      question_id: a.question_id as string,
      question: qText.get(a.question_id) ?? '',
      answers: labels,
    };
  });

  return NextResponse.json({
    id: sub.id,
    created_at: sub.created_at,
    name: sub.name ?? '',
    email: sub.email ?? '',
    phone: sub.phone ?? '',
    profile_code: res?.profile_code ?? null,
    flow_a: res?.flow_a ?? 0,
    flow_b: res?.flow_b ?? 0,
    flow_c: res?.flow_c ?? 0,
    flow_d: res?.flow_d ?? 0,
    answers: answerDtos,
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // delete children first to avoid FK issues
  await supabaseAdmin.from('mc_answers').delete().eq('submission_id', id);
  await supabaseAdmin.from('mc_results').delete().eq('submission_id', id);
  const { error } = await supabaseAdmin.from('mc_submissions').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
