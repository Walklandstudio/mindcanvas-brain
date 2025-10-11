import { NextResponse } from 'next/server';
import { admin, const { orgId, frameworkId } = await getOwnerOrgAndFramework() } from '../../_lib/org';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const auth = req.headers.get('authorization') ?? '';
    if (!auth.startsWith('Bearer ')) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 });

    const orgId = await const { orgId, frameworkId } = await getOwnerOrgAndFramework()(auth);
    if (!orgId) return NextResponse.json({ ok:false, error:'no_org' }, { status:401 });

    const a = admin();

    const { data: qs = [], error } = await a
      .from('org_questions')
      .select('id, label, kind, options, weight, is_segmentation, active, display_order')
      .eq('org_id', orgId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ ok:true, data: qs });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: String(e?.message ?? e) }, { status:500 });
  }
}
