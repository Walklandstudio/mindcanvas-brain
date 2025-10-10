import 'server-only';
import { NextResponse } from 'next/server';
import { admin, getOwnerOrgAndFramework } from '../../_lib/org';

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 });

    const { orgId } = await getOwnerOrgAndFramework();
    const svc = admin();
    // use service-role storage from supabase-js v2 via admin()
    const storage = (svc as any).storage.from('branding');

    const ext = (file.name?.split('.').pop() || 'png').toLowerCase();
    const path = `orgs/${orgId}/logo-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await storage.upload(path, buffer, {
      contentType: file.type || 'image/png',
      upsert: true,
    });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    const { data: pub } = storage.getPublicUrl(path);
    const url = pub.publicUrl;

    // persist URL into onboarding.branding
    const { error: updErr } = await svc
      .from('org_onboarding')
      .upsert({ org_id: orgId, branding: { logoUrl: url } }, { onConflict: 'org_id' });
    if (updErr) console.warn('onboarding branding upsert failed:', updErr.message);

    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'upload_failed' }, { status: 500 });
  }
}
