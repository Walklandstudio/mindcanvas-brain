import { NextResponse } from 'next/server';
import { admin, orgIdFromAuth } from '../../_lib/org';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const auth = req.headers.get('authorization') ?? '';
    if (!auth.startsWith('Bearer ')) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 });

    const orgId = await orgIdFromAuth(auth);
    if (!orgId) return NextResponse.json({ ok:false, error:'no_org' }, { status:401 });

    const a = admin();

    // latest framework for this org
    const { data: fw } = await a
      .from('org_frameworks')
      .select('id')
      .eq('org_id', orgId)
      .order('created_at', { ascending:false })
      .limit(1);

    const framework = fw?.[0];
    if (!framework) {
      return NextResponse.json({ ok:true, data: { framework:null, profiles:[], entries:[] }});
    }

    const framework_id = framework.id as string;

    const { data: profiles = [] } = await a
      .from('org_profiles')
      .select('id, code, name, primary_frequency')
      .eq('framework_id', framework_id)
      .order('code');

    const { data: entries = [] } = await a
      .from('org_profile_compatibility')
      .select('id, profile_a_id, profile_b_id, score, notes')
      .eq('framework_id', framework_id);

    return NextResponse.json({ ok:true, data: { framework, profiles, entries }});
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:String(e?.message ?? e) }, { status:500 });
  }
}
