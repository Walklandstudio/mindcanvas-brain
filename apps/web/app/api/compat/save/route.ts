import 'server-only';
import { NextResponse } from 'next/server';
import { admin, getOwnerOrgAndFramework } from '../../_lib/org';

export const runtime = 'nodejs';

type Pair = { a: string; b: string; score: number };

export async function POST(req: Request) {
  const svc = admin();
  const { frameworkId, orgId } = await getOwnerOrgAndFramework();

  const body = (await req.json()) as { pairs: Pair[] };
  if (!body?.pairs) return NextResponse.json({ error: 'Missing pairs' }, { status: 400 });

  const clean = body.pairs
    .filter(p => p.a && p.b && p.a !== p.b)
    .map(p => ({
      org_id: orgId,
      framework_id: frameworkId,
      profile_a: p.a,
      profile_b: p.b,
      score: Math.max(0, Math.min(100, Math.round(p.score))),
    }));

  // replace-all for this framework
  const { error: delErr } = await svc
    .from('org_profile_compatibility')
    .delete()
    .eq('framework_id', frameworkId);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  if (clean.length) {
    const { error: insErr } = await svc.from('org_profile_compatibility').insert(clean);
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
