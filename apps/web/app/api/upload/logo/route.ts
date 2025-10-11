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

    // Upload to public bucket "branding"
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

    // Merge branding.logoUrl into existing onboarding row (do not wipe other fields)
    const { data: current } = await svc
      .from('org_onboarding')
      .select('branding')
      .eq('org_id', orgId)
      .single();

    const branding = { ...(current?.branding ?? {}), logoUrl: url };

    const { error: updErr } = await svc
      .from('org_onboarding')
      .upsert({ org_id: orgId, branding }, { onConflict: 'org_id' });

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'upload_failed' }, { status: 500 });
  }
}
