// apps/web/app/api/_lib/org.ts
// Server helpers for Supabase admin client + org resolution
import 'server-only';
import { createClient as createServerClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // kept for future use (not needed in this file now)
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

// Admin client (service role) — use ONLY on the server
export function admin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    throw new Error('Supabase env vars missing for admin()');
  }
  return createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

  // Resolve the current org and its master framework for the logged-in owner.
// Falls back to the first org to keep staging/dev usable.
export async function getOwnerOrgAndFramework() {
  // Minimal, dependency-free version: use service role to fetch first org, ensure a framework.
  const svc = admin();
  const { data: org, error: orgErr } = await svc
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  if (orgErr || !org) throw new Error('No organizations found for this project.');

  let { data: framework } = await svc
    .from('org_frameworks')
    .select('*')
    .eq('org_id', org.id)
    .limit(1)
    .single();
  if (!framework) {
    const { data: created, error: cfErr } = await svc
      .from('org_frameworks')
      .insert({ org_id: org.id, name: 'Master Framework' })
      .select('*')
      .single();
    if (cfErr) throw cfErr;
    framework = created;
  }
  return { orgId: org.id as string, frameworkId: framework.id as string };
}

export async function orgIdFromAuth() {
  const { orgId } = await getOwnerOrgAndFramework();
  return orgId;
}