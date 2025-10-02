import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

type Body = {
  questionId?: string;
  key?: string;     // stable key like "goals"
  label?: string;   // nice label to show on profile
  answerText?: string;
};

function slugKey(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const q = await supabaseAdmin
    .from('mc_qualifications')
    .select('question_id,q_key,q_label,answer_text,created_at')
    .eq('submission_id', id)
    .order('created_at', { ascending: true });

  if (q.error) return NextResponse.json({ error: q.error.message }, { status: 400 });
  return NextResponse.json({ items: q.data ?? [] });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Body;

  const label = body.label?.trim() || 'Additional';
  const key = (body.key?.trim() || slugKey(label)) || 'extra';
  const row = {
    submission_id: id,
    question_id: body.questionId ?? null,
    q_key: key,
    q_label: label,
    answer_text: body.answerText ?? '',
  };

  const up = await supabaseAdmin
    .from('mc_qualifications')
    .upsert(row, { onConflict: 'submission_id,q_key' })
    .select('question_id,q_key,q_label,answer_text')
    .single();

  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 400 });
  return NextResponse.json({ ok: true, item: up.data });
}
