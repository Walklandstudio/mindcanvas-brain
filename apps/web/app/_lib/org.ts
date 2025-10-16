// apps/web/app/_lib/org.ts
import 'server-only';
import { createClient } from './supabase/server';

// Returns the first org_id for the signed-in user, or null.
export async function orgIdFromAuth(): Promise<string | null> {
  const sb = createClient();
  const { data, error } = await sb.rpc('org_id_from_auth');
  if (error) {
    console.error('org_id_from_auth RPC error:', error);
    return null;
  }
  return (data as string | null) ?? null;
}

// Ensures there is an org for the current user; creates and joins if missing.
export async function ensureOrg(name: string): Promise<string> {
  const sb = createClient();

  const { data: existing, error: exErr } = await sb.rpc('org_id_from_auth');
  if (!exErr && existing) return existing as string;

  const { data, error } = await sb.rpc('create_org_and_owner', { p_name: name });
  if (error) throw new Error(error.message);
  return data as string;
}
