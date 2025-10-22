// apps/web/app/_lib/portal.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Org = { id: string; name: string; slug: string };

const COOKIE_ORG_ID = "portal_org_id";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

/**
 * Create a Supabase client for server/route handlers.
 * NOTE: This version of @supabase/ssr supports only `cookies` (no `headers`).
 */
export async function getServerSupabase(): Promise<SupabaseClient> {
  const store = await cookies();

  const cookieAdapter = {
    get(name: string) {
      return store.get(name)?.value;
    },
    set(name: string, value: string, options?: CookieOptions & { domain?: string }) {
      store.set(name, value, options as any);
    },
    remove(name: string, options?: CookieOptions & { domain?: string }) {
      store.set(name, "", { ...(options as any), maxAge: 0 });
    },
  };

  return createServerClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: cookieAdapter as any,
      cookieOptions: { name: "sb:token" },
    }
  ) as unknown as SupabaseClient;
}

/** Back-compat alias used by some files */
export const supabaseServer = getServerSupabase;

/** “Admin” client — for now, uses the same SSR client. Keep the name for back-compat. */
export async function getAdminClient(): Promise<SupabaseClient> {
  return getServerSupabase();
}

/**
 * Get the active org id.
 * Back-compat: can be called with (sb) OR with no args (it will construct its own client).
 */
export async function getActiveOrgId(sb?: SupabaseClient): Promise<string | null> {
  const c = await cookies();
  const fromCookie = c.get(COOKIE_ORG_ID)?.value;
  if (fromCookie) return fromCookie;

  const client = sb ?? (await getServerSupabase());
  const { data: user } = await client.auth.getUser();
  const uid = user?.user?.id;
  if (!uid) return null;

  const { data, error } = await client
    .from("portal_members")
    .select("org_id")
    .eq("user_id", uid)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  const found = data?.org_id ?? null;
  if (found) {
    c.set(COOKIE_ORG_ID, found, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }
  return found;
}

/**
 * Ensure current user is a member of the org.
 * If orgId not supplied, resolves the active one.
 * Returns the resolved org id.
 */
export async function ensurePortalMember(
  sbOrOrgId: SupabaseClient | string | null | undefined,
  maybeOrgId?: string | null
): Promise<string> {
  let sb: SupabaseClient;
  let orgId: string | null | undefined;

  // Support both call shapes: ensurePortalMember(sb, orgId) OR ensurePortalMember(sb)
  if (typeof sbOrOrgId === "object" && sbOrOrgId !== null) {
    sb = sbOrOrgId as SupabaseClient;
    orgId = maybeOrgId ?? (await getActiveOrgId(sb));
  } else {
    // Legacy misuse: ensurePortalMember(orgId) — rarely used, but guard anyway
    sb = await getServerSupabase();
    orgId = (sbOrOrgId as string | null | undefined) ?? (await getActiveOrgId(sb));
  }

  if (!orgId) throw new Error("No active organization found.");
  const { data: user } = await sb.auth.getUser();
  const uid = user?.user?.id;
  if (!uid) throw new Error("Not authenticated.");

  const { data, error } = await sb
    .from("portal_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", uid)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("You are not a member of this organization.");

  return orgId;
}

/**
 * Get the active org record: { id, name, slug }.
 * Back-compat: getActiveOrg(sb) OR getActiveOrg() with no args.
 * Also supports getActiveOrg(sb, orgId) to force a specific org id.
 */
export async function getActiveOrg(
  sbOrOrgId?: SupabaseClient | string | null,
  maybeOrgId?: string | null
): Promise<Org | null> {
  let sb: SupabaseClient;
  let orgId: string | null | undefined;

  if (typeof sbOrOrgId === "object" || sbOrOrgId === undefined || sbOrOrgId === null) {
    sb = (sbOrOrgId as SupabaseClient) ?? (await getServerSupabase());
    orgId = maybeOrgId ?? (await getActiveOrgId(sb));
  } else {
    sb = await getServerSupabase();
    orgId = sbOrOrgId;
  }

  if (!orgId) return null;

  const { data, error } = await sb
    .from("organizations")
    .select("id, name, slug")
    .eq("id", orgId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return { id: data.id as string, name: data.name as string, slug: data.slug as string };
}

/**
 * Get branding for an org. If none exists, return sensible defaults.
 * Back-compat signature: getOrgBrand(orgId, sb?) and getOrgBrand(orgId) -> uses internal client.
 */
export async function getOrgBrand(
  orgId: string,
  sb?: SupabaseClient
): Promise<{ primary_color: string; logo_url: string | null; org_id: string }> {
  const client = sb ?? (await getServerSupabase());
  const { data, error } = await client
    .from("org_brand_settings")
    .select("org_id, primary_color, logo_url")
    .eq("org_id", orgId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return {
    org_id: orgId,
    primary_color: data?.primary_color ?? "#111827", // slate-900 default
    logo_url: data?.logo_url ?? null,
  };
}
