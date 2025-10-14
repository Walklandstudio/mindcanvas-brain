import 'server-only';
import { NextResponse } from 'next/server';
import { admin, getOwnerOrgAndFramework } from '../../_lib/org';

function randomToken(len = 22) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function POST(req: Request) {
  const body = await req.json();
  const name = (body?.name ?? '').trim() || 'Untitled Test';
  const mode = body?.mode === 'free' ? 'free' : 'full';

  const svc = admin();
  const { orgId } = await getOwnerOrgAndFramework();

  // Create a test
  const { data: test, error: tErr } = await svc
    .from('tests')
    .insert({ org_id: orgId, name, mode })
    .select('*')
    .single();
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  // Create a taker token
  const token = randomToken();
  const { data: taker, error: kErr } = await svc
    .from('test_takers')
    .insert({ test_id: test.id, token })
    .select('id, token')
    .single();
  if (kErr) return NextResponse.json({ error: kErr.message }, { status: 500 });

  return NextResponse.json({ testId: test.id, token: taker.token, shareUrl: `/t/${taker.token}` });
}
