import { NextResponse } from 'next/server';
import { admin, const { orgId, frameworkId } = await getOwnerOrgAndFramework() } from '../../_lib/org';

export const runtime = 'nodejs';

type Q = {
  id?: string;
  label: string;
  kind: 'scale'|'text'|'single'|'multi';
  options?: any;
  weight: number;
  is_segmentation: boolean;
  active: boolean;
  display_order: number;
};

type Body = { rows: Q[] };

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') ?? '';
    if (!auth.startsWith('Bearer ')) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 });

    const orgId = await const { orgId, frameworkId } = await getOwnerOrgAndFramework()(auth);
    if (!orgId) return NextResponse.json({ ok:false, error:'no_org' }, { status:401 });

    const body = await req.json().catch(() => null) as Body | null;
    if (!body?.rows) return NextResponse.json({ ok:false, error:'invalid_payload' }, { status:400 });

    const a = admin();

    // Upsert each row
    for (const r of body.rows) {
      const clean = {
        org_id: orgId,
        label: r.label.trim(),
        kind: r.kind,
        options: r.options ?? [],
        weight: Math.max(0, Number.isFinite(r.weight) ? Math.round(r.weight) : 1),
        is_segmentation: !!r.is_segmentation,
        active: !!r.active,
        display_order: Math.max(0, Number.isFinite(r.display_order) ? Math.round(r.display_order) : 0),
      };

      if (r.id) {
        await a.from('org_questions').update(clean).eq('id', r.id).eq('org_id', orgId);
      } else {
        await a.from('org_questions').insert(clean);
      }
    }

    return NextResponse.json({ ok:true });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: String(e?.message ?? e) }, { status:500 });
  }
}
