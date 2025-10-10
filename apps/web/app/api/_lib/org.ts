// apps/web/app/api/_lib/org.ts
import { createClient } from '@supabase/supabase-js';

export function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE!;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Staging helper – first org in DB. */
export async function orgIdFromAuth(): Promise<string> {
  const sb = admin();
  const { data, error } = await sb
    .from('organizations')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('No organizations found');
  return data.id as string;
}

/** Returns { orgId, frameworkId } for the owner org (first org + its first framework). */
export async function getOwnerOrgAndFramework(): Promise<{ orgId: string; frameworkId: string }> {
  const sb = admin();

  const { data: org, error: eo } = await sb
    .from('organizations')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (eo) throw eo;
  if (!org) throw new Error('No organizations exist');

  const { data: fw, error: ef } = await sb
    .from('org_frameworks')
    .select('id')
    .eq('org_id', org.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (ef) throw ef;
  if (!fw) throw new Error('No framework exists for organization');

  return { orgId: org.id as string, frameworkId: fw.id as string };
}
