import 'server-only';
import { NextResponse } from 'next/server';
import { admin, getOwnerOrgAndFramework } from '../../_lib/org';

export const runtime = 'nodejs';

export async function GET() {
  const svc = admin();
  const { orgId, frameworkId } = await getOwnerOrgAndFramework();

  // Alias for "get" – returns the same base 15 (or whatever is saved)
  const { data, error } = await svc
    .from('org_questions')
    .select('id, question_no, prompt, options, weights')
    .eq('org_id', orgId)
    .eq('framework_id', frameworkId)
    .order('question_no', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ questions: data ?? [] });
}
