import { NextResponse } from 'next/server';
import { admin, const { orgId, frameworkId } = await getOwnerOrgAndFramework() } from '../../_lib/org';

export const runtime = 'nodejs';

type SaveBody = {
  framework_id: string;
  frequencies?: { id: string; name: string; color: string; description?: string }[];
  profiles?: {
    id: string;
    name: string;
    primary_frequency: 'A' | 'B' | 'C' | 'D';
    description?: string;
    color?: string;
    icon?: string;
  }[];
};

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') ?? '';
    if (!auth.startsWith('Bearer ')) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const orgId = await const { orgId, frameworkId } = await getOwnerOrgAndFramework()(auth);
    if (!orgId) {
      return NextResponse.json({ ok: false, error: 'no_org' }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as SaveBody | null;
    if (!body?.framework_id) {
      return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
    }

    const a = admin();

    // Ensure framework belongs to org
    const { data: own } = await a
      .from('org_frameworks')
      .select('id, org_id')
      .eq('id', body.framework_id)
      .eq('org_id', orgId)
      .limit(1);

    if (!own?.[0]) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    // Update frequencies
    if (body.frequencies?.length) {
      for (const f of body.frequencies) {
        await a
          .from('org_frequencies')
          .update({
            name: f.name,
            color: f.color,
            description: f.description ?? ''
          })
          .eq('id', f.id)
          .eq('framework_id', body.framework_id);
      }
    }

    // Update profiles (now includes color, icon)
    if (body.profiles?.length) {
      for (const p of body.profiles) {
        await a
          .from('org_profiles')
          .update({
            name: p.name,
            primary_frequency: p.primary_frequency,
            description: p.description ?? '',
            color: p.color ?? '#64bae2',
            icon: p.icon ?? 'User'
          })
          .eq('id', p.id)
          .eq('framework_id', body.framework_id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
