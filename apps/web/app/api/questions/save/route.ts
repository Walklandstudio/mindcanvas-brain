import 'server-only';
import { NextResponse } from 'next/server';
import { admin, getOwnerOrgAndFramework } from '../../_lib/org';

export const runtime = 'nodejs';

type Q = {
  id?: string;
  question_no: number;
  prompt: string;
  options: Array<{ label: string; code: 'A'|'B'|'C'|'D' }>;
  weights: Record<'A'|'B'|'C'|'D', number>;
};

export async function POST(req: Request) {
  const body = (await req.json()) as { questions: Q[] };
  if (!Array.isArray(body?.questions) || body.questions.length === 0) {
    return NextResponse.json({ error: 'Missing questions' }, { status: 400 });
  }

  const svc = admin();
  const { orgId, frameworkId } = await getOwnerOrgAndFramework();

  // Normalize rows
  const rows = body.questions.map((q) => ({
    id: q.id ?? undefined,
    org_id: orgId,
    framework_id: frameworkId,
    question_no: q.question_no,
    prompt: q.prompt,
    options: q.options,
    weights: q.weights,
  }));

  // Upsert by (id) when present; otherwise insert
  const { error } = await svc.from('org_questions').upsert(rows, { onConflict: 'id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return refreshed list
  const { data, error: readErr } = await svc
    .from('org_questions')
    .select('id, question_no, prompt, options, weights')
    .eq('org_id', orgId)
    .eq('framework_id', frameworkId)
    .order('question_no', { ascending: true });

  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  return NextResponse.json({ ok: true, questions: data ?? [] });
}
