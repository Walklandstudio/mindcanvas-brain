import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    questionId?: string;
    optionId?: string | string[];
  };

  const questionId = body.questionId?.toString();
  const opt = body.optionId;
  if (!questionId || typeof opt === 'undefined') {
    return NextResponse.json({ error: 'Missing questionId/optionId' }, { status: 400 });
  }

  // Normalize to jsonb value
  const selected =
    Array.isArray(opt) ? (opt.map(x => String(x))) : typeof opt === 'string' ? opt : String(opt);

  // Write to `selected` jsonb; upsert on (submission_id, question_id)
  const { error } = await supabaseAdmin
    .from('mc_answers')
    .upsert(
      { submission_id: id, question_id: questionId, selected },
      { onConflict: 'submission_id,question_id' },
    );

  if (error) {
    return NextResponse.json({ error: 'Failed to save answer', details: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

