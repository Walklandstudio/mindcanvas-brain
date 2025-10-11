import 'server-only';
import { NextResponse } from 'next/server';
import { admin, getOwnerOrgAndFramework } from '../../_lib/org';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'missing_file' }, { status: 400 });

  const svc = admin();
  const { orgId } = await getOwnerOrgAndFramework();

  const ext = file.name.split('.').pop() || 'bin';
  const path = `${orgId}/logo.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { data, error } = await svc.storage
    .from('branding')
    .upload(path, new Uint8Array(arrayBuffer), { upsert: true, contentType: file.type });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: pub } = svc.storage.from('branding').getPublicUrl(path);
  return NextResponse.json({ url: pub.publicUrl });
}
