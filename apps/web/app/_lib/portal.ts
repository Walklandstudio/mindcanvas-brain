// apps/web/app/_lib/portal.ts
import 'server-only';
import { cookies, headers } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { readActiveOrgIdFromCookie } from './org-active';

// Local alias that won't fight supabase-js generics across versions
type AnyClient = ReturnType<typeof createClient<any>>;

// ── Env + origin helpers ──────────────────────────────────────────────────────
function reqEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function getAppOrigin(): Promise<string> {
  const configured = process.env.APP_ORIGIN?.replace(/\/+$/, '');
  if (configured) return configured;

  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    const proto = h.get('x-forwarded-proto') || 'http';
    if (host) return `${proto}://${host}`;
  } catch {
    // ignore if not in request scope
  }
  return 'http://localhost:3000';
}

// ── Server user-scoped Supabase client (RLS applies) ──────────────────────────
export async function getServerSupabase() {
  const supabaseUrl = reqEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = reqEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  const jar = await cookies();

  const cookieAdapter = {
    get(name: string) {
      return jar.get(name)?.value;
    },
    set(name: string, value: string, options: any) {
      try {
        jar.set({ name, value, ...(options || {}) });
      } catch {}
    },
    remove(name: string, options: any) {
      try {
        jar.set({ name, value: '', ...(options || {}), maxAge: 0 });
      } catch {}
    },
  };

  // Let types be inferred from createServerClient
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: cookieAdapter as any,
  });
}

// ── Service-role (admin) client — SERVER ONLY (bypasses RLS) ──────────────────
declare global {
  // eslint-disable-next-line no-var
  var __sb_admin__: AnyClient | undefined;
}

export async function getAdminClient(): Promise<AnyClient> {
  if (global.__sb_admin__) return global.__sb_admin__!;
  const supabaseUrl = reqEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRole = reqEnv('SUPABASE_SERVICE_ROLE_KEY');

  const client = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': '@mindcanvas/web-admin' } },
  });

  global.__sb_admin__ = client;
  return client;
}

// ── Active org resolution ─────────────────────────────────────────────────────
export async function getActiveOrgId(sb?: AnyClient): Promise<string | null> {
  // 1) Platform-admin “view as” cookie
  const viaCookie = await readActiveOrgIdFromCookie();
  if (viaCookie) return viaCookie;

  // 2) User-scoped client
  const userSb = sb ?? (await getServerSupabase());

  const { data: auth } = await userSb.auth.getUser();
  const user = auth?.user ?? null;
  if (!user) return null;

  // A) portal_members
  try {
    const pm = await userSb
      .from('portal_members')
      .select('org_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!pm.error && pm.data?.org_id) return pm.data.org_id as string;
  } catch {}

  // B) org_members
  try {
    const om = await userSb
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!om.error && om.data?.org_id) return om.data.org_id as string;
  } catch {}

  // C) profiles.default_org_id
  try {
    const prof = await userSb
      .from('profiles')
      .select('default_org_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!prof.error && prof.data?.default_org_id) return prof.data.default_org_id as string;
  } catch {}

  return null;
}

export async function requireActiveOrgId(): Promise<string> {
  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error('No active organization');
  return orgId;
}

// ── Optional admin lookups ────────────────────────────────────────────────────
export async function getOrgBySlug(slug: string) {
  const admin = await getAdminClient();
  return admin.from('organizations').select('id, name, slug').eq('slug', slug).maybeSingle();
}

export async function getOrgName(orgId: string): Promise<string | null> {
  const admin = await getAdminClient();
  const { data } = await admin.from('organizations').select('name').eq('id', orgId).maybeSingle();
  return data?.name ?? null;
}
