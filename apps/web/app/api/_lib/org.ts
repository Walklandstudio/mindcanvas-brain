// ...existing imports/exports...
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// Already in your file, but shown here for context
export function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );
}

// fetch first org owned by the current user (simple & safe default)
export async function getOwnerOrgAndFramework() {
  const a = admin();
  // current user id is in auth.uid() only in RLS; here we must supply it:
  // If you already keep user’s org in session, replace this with your own logic.
  // For staging simplicity: use OWNER org (owner_user_id is set now).
  const { data: org, error: orgErr } = await a
    .from('organizations')
    .select('id')
    .not('owner_user_id','is',null)
    .limit(1)
    .maybeSingle();

  if (orgErr) throw orgErr;
  if (!org) throw new Error('No owned organization found for this user.');

  const { data: fw, error: fwErr } = await a
    .from('org_frameworks')
    .select('id')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fwErr) throw fwErr;
  if (!fw) throw new Error('No framework found for this organization.');

  return { orgId: org.id as string, frameworkId: fw.id as string };
}
