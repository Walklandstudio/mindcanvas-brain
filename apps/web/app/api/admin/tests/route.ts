import 'server-only';
import { NextResponse } from 'next/server';
import { admin, getOwnerOrgAndFramework } from '../../_lib/org';

export async function GET() {
  const svc = admin();
  const { orgId } = await getOwnerOrgAndFramework();
  const { data } = await svc.from('tests').select('*').eq('org_id', orgId).order('created_at',{ascending:false});
  return NextResponse.json({ tests: data ?? [] });
}

export async function POST(req: Request) {
  const body = await req.json() as { name: string; mode: 'free'|'full'; question_ids: number[] };
  if (!body?.name || !body?.mode || !Array.isArray(body.question_ids)) {
    return NextResponse.json({ error:'invalid_payload' }, { status:400 });
  }
  const svc = admin();
  const { orgId, frameworkId } = await getOwnerOrgAndFramework();
  const { data, error } = await svc
    .from('tests')
    .insert({ org_id: orgId, framework_id: frameworkId, name: body.name, mode: body.mode, question_ids: body.question_ids })
    .select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status:500 });
  return NextResponse.json({ test: data });
}
