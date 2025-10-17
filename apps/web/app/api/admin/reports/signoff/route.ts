import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from '../../../../_lib/supabase/server';
import { orgIdFromAuth } from '../../../../_lib/org';

export async function POST(req: Request) {
  const { testId, content } = await req.json();
  const sb = createClient();
  const orgId = await orgIdFromAuth();
  if (!orgId) return NextResponse.json({ error: 'no-org' }, { status: 400 });

  const { data: userRes, error: authErr } = await sb.auth.getUser();
  if (authErr || !userRes.user) return NextResponse.json({ error: 'no-user' }, { status: 401 });

  const { error } = await sb
    .from('report_signoffs')
    .insert({ org_id: orgId, test_id: testId, content, signed_by: userRes.user.id });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
