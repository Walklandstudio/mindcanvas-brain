import 'server-only';
import { NextResponse } from 'next/server';
import { admin, getOwnerOrgAndFramework } from '../../_lib/org';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const svc = admin();
    const { orgId, frameworkId } = await getOwnerOrgAndFramework();

    const row = {
      org_id: orgId,
      framework_id: frameworkId,
      profile_name: String(body?.profileName || 'Unnamed'),
      sections: body?.sections ?? [],
    };

    const { data, error } = await svc
      .from('org_report_drafts')
      .insert(row)
      .select('id, profile_name, sections, created_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ draft: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Bad request' }, { status: 400 });
  }
}
