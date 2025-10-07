import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  );
}

function userClient(bearer: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: bearer } } }
  );
}

async function getOrgId(bearer: string) {
  const u = userClient(bearer);
  const { data: ures } = await u.auth.getUser();
  const uid = ures?.user?.id;
  if (!uid) return null;
  const a = admin();
  const { data: m } = await a
    .from('org_memberships')
    .select('org_id')
    .eq('user_id', uid)
    .limit(1);
  return m?.[0]?.org_id ?? null;
}

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ ok: false, error: 'missing bearer token' }, { status: 401 });
  }
  const orgId = await getOrgId(auth);
  if (!orgId) return NextResponse.json({ ok: false, error: 'no org' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'missing file' }, { status: 400 });
  }

  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `orgs/${orgId}/logo.${ext}`;

  const a = admin();
  const { error } = await a.storage.from('org-assets').upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/png'
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Get a public URL
  const { data: pub } = a.storage.from('org-assets').getPublicUrl(path);
  return NextResponse.json({ ok: true, url: pub.publicUrl, path });
}
