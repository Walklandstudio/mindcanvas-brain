import { NextResponse } from 'next/server';
import { admin, orgIdFromAuth } from '../../_lib/org';

export const runtime = 'nodejs';

type ReSeedBody = {
  framework_id: string;
  template?: {
    names?: string[];                 // optional 8 names
    primaryMap?: ('A'|'B'|'C'|'D')[]; // optional 8 primary frequency codes
  };
};

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') ?? '';
    if (!auth.startsWith('Bearer ')) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const orgId = await orgIdFromAuth(auth);
    if (!orgId) {
      return NextResponse.json({ ok: false, error: 'no_org' }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as ReSeedBody | null;
    if (!body?.framework_id) {
      return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
    }

    const a = admin();

    // Verify framework belongs to org
    const { data: fw } = await a
      .from('org_frameworks')
      .select('id, org_id')
      .eq('id', body.framework_id)
      .limit(1);

    if (!fw?.[0] || fw[0].org_id !== orgId) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    // Defaults if no template provided
    const defaultNames = [
      'Profile 1','Profile 2','Profile 3','Profile 4',
      'Profile 5','Profile 6','Profile 7','Profile 8'
    ];
    const defaultPrim = ['A','B','C','D','A','B','C','D'] as ('A'|'B'|'C'|'D')[];

    const names = body.template?.names?.length === 8 ? body.template.names : defaultNames;
    const prims = body.template?.primaryMap?.length === 8 ? body.template.primaryMap : defaultPrim;

    // Blow away existing profiles for this framework and insert eight fresh ones
    await a.from('org_profiles').delete().eq('framework_id', body.framework_id);

    const rows = Array.from({ length: 8 }).map((_, i) => ({
      framework_id: body.framework_id,
      code: i + 1,
      name: names[i],
      primary_frequency: prims[i],
      description: '',
      color: '#64bae2',
      icon: 'User'
    }));

    const { error: insErr } = await a.from('org_profiles').insert(rows);
    if (insErr) throw insErr;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
