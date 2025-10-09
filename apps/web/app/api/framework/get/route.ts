import { NextResponse } from 'next/server';
import { admin, orgIdFromAuth } from '../../_lib/org';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const auth = req.headers.get('authorization') ?? '';
    if (!auth.startsWith('Bearer ')) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const orgId = await orgIdFromAuth(auth);
    if (!orgId) {
      return NextResponse.json({ ok: false, error: 'no_org' }, { status: 401 });
    }

    const a = admin();

    // Get latest framework for this org
    const { data: fw, error: fwErr } = await a
      .from('org_frameworks')
      .select('id, name, version, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fwErr) throw fwErr;

    const framework = fw?.[0] ?? null;
    if (!framework) {
      return NextResponse.json({
        ok: true,
        data: { framework: null, frequencies: [], profiles: [] }
      });
    }

    const frameworkId = framework.id as string;

    const { data: freqs = [], error: fErr } = await a
      .from('org_frequencies')
      .select('id, framework_id, code, name, color, description')
      .eq('framework_id', frameworkId)
      .order('code');

    if (fErr) throw fErr;

    const { data: profs = [], error: pErr } = await a
      .from('org_profiles')
      .select('id, framework_id, code, name, primary_frequency, description')
      .eq('framework_id', frameworkId)
      .order('code');

    if (pErr) throw pErr;

    return NextResponse.json({
      ok: true,
      data: {
        framework,
        frequencies: freqs,
        profiles: profs
      }
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
