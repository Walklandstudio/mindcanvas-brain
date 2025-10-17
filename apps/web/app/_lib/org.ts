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

  // If the user already belongs to an org, reuse it
  const { data: existing, error: exErr } = await sb.rpc('org_id_from_auth');
  if (!exErr && existing) return existing as string;

  // IMPORTANT: pass both named args so PostgREST can map them exactly
  const { data, error } = await sb.rpc('create_org_and_owner', {
    p_name: name,
    p_slug: null as unknown as string | null, // explicit null for clarity
  });
  if (error) throw new Error(error.message);
  return data as string;
}
