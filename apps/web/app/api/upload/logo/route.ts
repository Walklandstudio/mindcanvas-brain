import 'server-only';
import { NextResponse } from 'next/server';
import { admin, getOwnerOrgAndFramework } from '../../_lib/org';
import { createClient as createServerClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

/**
 * POST form-data: { file: Blob }
 * Saves to storage bucket "org-assets" at orgs/{orgId}/logo-<ts>.<ext>
 * Returns { url }
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 });

    const svc = admin();
    const { orgId } = await getOwnerOrgAndFramework();

    // Ensure bucket exists (no-op if it already does)
    const storageAdmin = createServerClient(SUPABASE_URL, SERVICE_ROLE);
    await storageAdmin.storage.createBucket('org-assets', { public: true }).catch(() => {});

    // Build path
    const ext = (file.name?.split('.').pop() || 'png').toLowerCase();
    const path = `orgs/${orgId}/logo-${Date.now()}.${ext}`;

    // Upload
    const { error: upErr } = await storageAdmin.storage
      .from('org-assets')
      .upload(path, file, { contentType: file.type || 'image/png', upsert: true });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    // Public URL
    const { data: pub } = storageAdmin.storage.from('org-assets').getPublicUrl(path);
    const url = pub.publicUrl;

    // Persist to onboarding.branding.logoUrl for convenience
    const { data: ob, error: upsertErr } = await svc
      .from('org_onboarding')
      .upsert({ org_id: orgId, branding: { logoUrl: url } }, { onConflict: 'org_id', ignoreDuplicates: false })
      .select('*')
      .single();
    if (upsertErr) {
      // Non-fatal for the API; we still return the URL
      console.warn('onboarding upsert (logoUrl) failed:', upsertErr.message);
    }

    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'upload_failed' }, { status: 500 });
  }
}
