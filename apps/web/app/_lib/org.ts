// apps/web/app/_lib/org.ts
import 'server-only';
import { createClient } from './supabase/server';

export async function orgIdFromAuth(): Promise<string | null> {
  const sb = createClient();
  const { data, error } = await sb.rpc('org_id_from_auth');
  if (error) {
    console.error('org_id_from_auth RPC error:', error);
    return null;
  }
  return (data as string | null) ?? null;
}

/** Creates an org for the current user (owner) if none exists; returns its id. */
export async function ensureOrg(name: string): Promise<string> {
  const sb = createClient();

  const { data: existing } = await sb.rpc('org_id_from_auth');
  if (existing) return existing as string;

  const { data, error } = await sb.rpc('create_org_and_owner', { p_name: name });
  if (error) throw new Error(error.message);
  return data as string;
}
