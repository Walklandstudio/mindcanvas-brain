// apps/web/app/_lib/portal.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Org = { id: string; name: string; slug: string };

const COOKIE_ORG_ID = "portal_org_id";

function getEnv(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

/**
 * Supabase server client (SSR) for Next.js 15 (async Request APIs).
 * NOTE: The @supabase/ssr createServerClient here accepts only `cookies` (no `headers`).
 */
export async function getServerSupabase(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  // Adapter that @supabase/ssr expects
  const cookieAdapter = {
    get(name: string) {
      return cookieStore.get(name)?.value;
    },
    set(name: string, value: string, options?: CookieOptions & { domain?: string }) {
      cookieStore.set(name, value, options as any);
    },
    remove(name: string, options?: CookieOptions & { domain?: string }) {
      cookieStore.set(name, "", { ...(options as any), maxAge: 0 });
    },
  };

  const sb = createServerClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: cookieAdapter as any,
      cookieOptions: { name: "sb:token" },
      // ❌ no `headers` key here – it is not supported in your version
    }
  );

  return sb as unknown as SupabaseClient;
}

/**
 * Resolve the active org id for this session.
 * 1) cookie 'portal_org_id'
 * 2) first membership in portal_members
 * If found via membership, cache to cookie.
 */
export async function getActiveOrgId(sb: SupabaseClient): Promise<string | null> {
  const c = await cookies();
  const fromCookie = c.get(COOKIE_ORG_ID)?.value;
  if (fromCookie) return fromCookie;

  const { data: user } = await sb.auth.getUser();
  const uid = user?.user?.id;
  if (!uid) return null;

  const { data, error } = await sb
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
 * Ensure the current user is a member of orgId (or of *some* org if orgId is absent).
 * Returns the resolved org id on success.
 */
export async function ensurePortalMember(
  sb: SupabaseClient,
  orgId?: string | null
): Promise<string> {
  const resolved = orgId ?? (await getActiveOrgId(sb));
  if (!resolved) throw new Error("No active org in context.");

  const { data: user } = await sb.auth.getUser();
  const uid = user?.user?.id;
  if (!uid) throw new Error("Not authenticated.");

  const { data, error } = await sb
    .from("portal_members")
    .select("org_id")
    .eq("org_id", resolved)
    .eq("user_id", uid)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("You are not a member of this organization.");

  return resolved;
}

/**
 * Get { id, name, slug } for current org (or the provided orgId).
 */
export async function getActiveOrg(
  sb: SupabaseClient,
  orgId?: string | null
): Promise<Org | null> {
  const resolved = orgId ?? (await getActiveOrgId(sb));
  if (!resolved) return null;

  const { data, error } = await sb
    .from("organizations")
    .select("id, name, slug")
    .eq("id", resolved)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return { id: data.id as string, name: data.name as string, slug: data.slug as string };
}
