// apps/web/app/api/_lib/org.ts
import 'server-only';
import { createClient as createServerClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

export function admin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    throw new Error('Supabase env vars missing for admin()');
  }
  return createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getOwnerOrgAndFramework() {
  const svc = admin();

  // 1) Ensure there is at least one org
  let { data: org, error: orgErr } = await svc
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (orgErr || !org) {
    const slug = 'default-org';
    const { data: created, error: insErr } = await svc
      .from('organizations')
      .insert({ name: 'Default Org', slug })
      .select('*')
      .single();
    if (insErr) throw insErr;
    org = created;
  }

  // 2) Ensure a framework exists for that org
  let { data: framework } = await svc
    .from('org_frameworks')
    .select('*')
    .eq('org_id', org.id)
    .limit(1)
    .single();

  if (!framework) {
    const { data: createdFw, error: cfErr } = await svc
      .from('org_frameworks')
      .insert({ org_id: org.id, name: 'Master Framework' })
      .select('*')
      .single();
    if (cfErr) throw cfErr;
    framework = createdFw;
  }

  return { orgId: org.id as string, frameworkId: framework.id as string };
}

export async function orgIdFromAuth(_auth?: string) {
  const { orgId } = await getOwnerOrgAndFramework();
  return orgId;
}
