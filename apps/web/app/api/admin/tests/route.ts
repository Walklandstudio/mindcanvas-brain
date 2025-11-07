import 'server-only';
import { NextResponse } from 'next/server';
import { admin, getOwnerOrgAndFramework } from '../../_lib/org';

/**
 * GET /api/admin/tests?orgId=<uuid>
 * Lists tests for the specified org (id), for use in the Link Generator dropdown.
 * Non-breaking: only adds a GET handler; your existing POST remains untouched.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const orgId = url.searchParams.get('orgId');
    if (!orgId) {
      return NextResponse.json({ ok: false, error: 'Missing orgId' }, { status: 400 });
    }

    const svc = admin(); // service client
    const { data, error } = await svc
      .from('tests')                // table: portal.tests if you use schemas via the client; otherwise set schema on the client factory
      .select('id, name, test_type, is_active')
      .eq('org_id', orgId)
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'GET /tests failed' }, { status: 500 });
  }
}

/**
 * POST /api/admin/tests
 * Your original create-test logic (UNCHANGED).
 */
export async function POST(req: Request) {
  const { mode, name } = await req.json();
  if (!['free','full'].includes(mode)) return NextResponse.json({ error: 'mode' }, { status: 400 });

  const svc = admin();
  const { orgId, frameworkId } = await getOwnerOrgAndFramework();

  // create def
  const { data: def, error: defErr } = await svc
    .from('org_test_defs')
    .insert({ org_id: orgId, framework_id: frameworkId, name: name || (mode==='free'?'Free Test':'Full Test'), mode })
    .select('*').single();
  if (defErr) return NextResponse.json({ error: defErr.message }, { status: 500 });

  // load base questions (15) and pick subset for free
  const { data: base } = await svc
    .from('org_questions')
    .select('*')
    .eq('org_id', orgId)
    .eq('framework_id', frameworkId)
    .order('question_no');

  const pick = mode === 'free' ? (base || []).slice(0, 7) : (base || []);
  const rows = pick.map((q, i) => ({
    test_id: def.id,
    q_no: i+1,
    source: 'base',
    prompt: q.prompt,
    options: q.options,
    weights: q.weights
  }));

  if (rows.length) {
    const { error: insErr } = await svc.from('org_test_questions').insert(rows);
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, testId: def.id });
}
