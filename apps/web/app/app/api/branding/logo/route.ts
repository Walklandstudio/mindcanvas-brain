import 'server-only';
import { NextResponse } from 'next/server';
import { admin, getOwnerOrgAndFramework } from '../../_lib/org';

export async function POST(req: Request) {
  const { orgId } = await getOwnerOrgAndFramework();
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const svc = admin();
  // raw storage API: use Storage via PostgREST RPC
  const path = `${orgId}/logo-${Date.now()}-${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  // Supabase JS storage (node) via service role:
  const storage = (svc as any).storage.from('branding');
  const { error: upErr } = await storage.upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data } = storage.getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
