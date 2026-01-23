// apps/web/app/_lib/portal.ts
// Central helpers for Supabase clients and org scoping (App Router / server).

import "server-only";
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { readActiveOrgIdFromCookie } from "./org-active";

// Local alias that won't fight supabase-js generics across versions
type AnyClient = ReturnType<typeof createClient<any>>;

// ── Env + origin helpers ──────────────────────────────────────────────────────
function getEnv(name: string) {
  return process.env[name] ?? "";
}

export async function getAppOrigin(): Promise<string> {
  const configured = process.env.APP_ORIGIN?.replace(/\/+$/, "");
  if (configured) return configured;

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    const proto = h.get("x-forwarded-proto") || "http";
    if (host) return `${proto}://${host}`;
  } catch {
    // ignore if not in request scope
  }
  return "http://localhost:3000";
}

// ── Server user-scoped Supabase client (RLS applies) ──────────────────────────
// IMPORTANT: Use @supabase/ssr cookie interface: getAll/setAll
export async function getServerSupabase() {
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  const jar = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        // Next cookies() already returns parsed cookie objects
        return jar.getAll().map((c) => ({ name: c.name, value: c.value }));
      },
      setAll(cookiesToSet) {
        // This is what persists auth sessions (critical)
        for (const { name, value, options } of cookiesToSet) {
          try {
            jar.set({ name, value, ...(options || {}) });
          } catch {
            // Some runtimes / server component contexts may restrict mutation
          }
        }
      },
    },
  });
}

// ── Service-role (admin) client — SERVER ONLY (bypasses RLS) ──────────────────
declare global {
  // eslint-disable-next-line no-var
  var __sb_admin__: AnyClient | undefined;
}

export async function getAdminClient(): Promise<AnyClient> {
  if (global.__sb_admin__) return global.__sb_admin__!;
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRole = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) {
    throw new Error(
      "Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  const client = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "@mindcanvas/web-admin" } },
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

  // ✅ Current system: portal.user_orgs
  // NOTE: portal.user_orgs DOES NOT have created_at in your schema
  try {
    const r = await userSb
      .schema("portal")
      .from("user_orgs")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!r.error && r.data?.org_id) return String(r.data.org_id);
  } catch {}

  // (Legacy fallbacks kept for safety — remove later when confirmed unused)

  // A) portal_members
  try {
    const pm = await userSb
      .from("portal_members")
      .select("org_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!pm.error && pm.data?.org_id) return String(pm.data.org_id);
  } catch {}

  // B) org_members
  try {
    const om = await userSb
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!om.error && om.data?.org_id) return String(om.data.org_id);
  } catch {}

  // C) profiles.default_org_id
  try {
    const prof = await userSb
      .from("profiles")
      .select("default_org_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!prof.error && prof.data?.default_org_id)
      return String(prof.data.default_org_id);
  } catch {}

  return null;
}

export async function requireActiveOrgId(): Promise<string> {
  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No active organization");
  return orgId;
}

// Back-compat shim (if any old code imports this name)
export const supabaseServer = getServerSupabase;

// ── Optional admin lookups ────────────────────────────────────────────────────
export async function getOrgBySlug(slug: string) {
  const admin = await getAdminClient();
  return admin
    .schema("portal")
    .from("orgs")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();
}

export async function getOrgName(orgId: string): Promise<string | null> {
  const admin = await getAdminClient();
  const { data } = await admin
    .schema("portal")
    .from("orgs")
    .select("name")
    .eq("id", orgId)
    .maybeSingle();
  return (data?.name as string) ?? null;
}
