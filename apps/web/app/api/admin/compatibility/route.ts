// ==============================
// NEW: /admin/compatibility (Step 2)
// ==============================

// apps/web/app/api/admin/compatibility/route.ts
import 'server-only';
import { NextResponse } from 'next/server';
import { admin, getOwnerOrgAndFramework } from '../../_lib/org';

type PairDTO = { a: string; b: string; score: number };

export async function GET() {
  const svc = admin();
  const { orgId, frameworkId } = await getOwnerOrgAndFramework();

  const { data: profiles, error: pErr } = await svc
    .from('org_profiles')
    .select('id, name, frequency, ordinal')
    .eq('org_id', orgId)
    .eq('framework_id', frameworkId)
    .order('ordinal', { ascending: true });
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const { data: rows, error: cErr } = await svc
    .from('org_profile_compatibility')
    .select('profile_a, profile_b, score')
    .eq('framework_id', frameworkId);
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  const pairs: PairDTO[] = (rows ?? []).map(r => ({ a: r.profile_a, b: r.profile_b, score: r.score }));
  return NextResponse.json({ profiles, pairs });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { pairs: PairDTO[] };
  if (!body?.pairs) return NextResponse.json({ error: 'Missing pairs' }, { status: 400 });

  const svc = admin();
  const { orgId, frameworkId } = await getOwnerOrgAndFramework();

  // Normalize & sanitize
  const clean = body.pairs
    .filter(p => p.a !== p.b)
    .map(p => ({
      org_id: orgId,
      framework_id: frameworkId,
      profile_a: p.a,
      profile_b: p.b,
      score: Math.max(0, Math.min(100, Math.round(p.score)))
    }));

  // Replace-all strategy for simplicity & consistency
  const { error: delErr } = await svc
    .from('org_profile_compatibility')
    .delete()
    .eq('framework_id', frameworkId);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  if (clean.length) {
    const { error: insErr } = await svc
      .from('org_profile_compatibility')
      .insert(clean);
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}