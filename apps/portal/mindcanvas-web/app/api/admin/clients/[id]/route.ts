import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type ClientRow = {
  submission_id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  profile_code: string | null;
  flow_a: number | null;
  flow_b: number | null;
  flow_c: number | null;
  flow_d: number | null;
};

type AnswerRow = { question: string | null; selected_text: string | null };

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // 1) Base client row from the view
  const { data: row, error: rowErr } = await supabaseAdmin
    .from('v_mc_clients_list')
    .select('*')
    .eq('submission_id', id)
    .maybeSingle<ClientRow>();

  if (rowErr || !row) {
    return NextResponse.json({ error: rowErr?.message || 'Not found' }, { status: 404 });
  }

  // 2) Report id (kept on mc_submissions)
  const { data: subMeta } = await supabaseAdmin
    .from('mc_submissions')
    .select('report_id')
    .eq('id', id)
    .maybeSingle<{ report_id: string | null }>();

  // 3) Answers from normalized answers view
  const { data: answersData } = await supabaseAdmin
    .from('v_mc_answers_flat')
    .select('question, selected_text')
    .eq('submission_id', id)
    .order('question', { ascending: true });

  const answers = (answersData ?? ([] as AnswerRow[])).map((a) => ({
    question: a.question ?? '',
    selected: a.selected_text ?? '',
  }));

  const flow =
    row.flow_a === null || row.flow_b === null || row.flow_c === null || row.flow_d === null
      ? null
      : {
          A: Number(row.flow_a),
          B: Number(row.flow_b),
          C: Number(row.flow_c),
          D: Number(row.flow_d),
        };

  return NextResponse.json({
    id: row.submission_id,
    created_at: row.created_at,
    report_id: subMeta?.report_id ?? null,
    name: row.name,
    email: row.email,
    phone: row.phone,
    profile_code: row.profile_code,
    flow,
    answers,
  });
}
