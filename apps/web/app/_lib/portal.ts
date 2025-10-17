// apps/web/app/_lib/portal.ts
import { cookies, headers } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
// Swap `any` for your generated Database type if you have one.
type Database = any;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Next.js 15: cookies() / headers() can be async. Resolve once and pass sync methods to Supabase.
 */
export async function getServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options?: CookieOptions) {
        try {
          // @ts-ignore: server runtime supports set()
          cookieStore.set(name, value, options);
        } catch {
          /* no-op in immutable contexts */
        }
      },
      remove(name: string, options?: CookieOptions) {
        try {
          // @ts-ignore
          cookieStore.set(name, "", { ...options, maxAge: 0 });
        } catch {
          /* no-op */
        }
      },
    },
  });
}

/**
 * Resolve the active org_id for the Client Portal.
 * Priority:
 * 1) x-portal-org-slug header (set by /portal/[slug])
 * 2) cookie "portal_org_id"
 * 3) env NEXT_PUBLIC_PORTAL_DEFAULT_ORG_SLUG (staging convenience)
 * 4) fallback: first org in DB
 */
export async function getPortalOrgId(): Promise<string> {
  const sb = await getServerSupabase();
  const hdrs = await headers();

  const slugFromHeader = hdrs.get("x-portal-org-slug") || undefined;

  const cookieStore = await cookies();
  const orgCookie = cookieStore.get("portal_org_id")?.value;

  const envSlug = process.env.NEXT_PUBLIC_PORTAL_DEFAULT_ORG_SLUG || undefined;

  async function idBySlug(slug: string) {
    const { data, error } = await sb.from("organizations").select("id").eq("slug", slug).maybeSingle();
    if (error) throw error;
    return data?.id as string | undefined;
  }

  if (slugFromHeader) {
    const id = await idBySlug(slugFromHeader);
    if (id) return id;
  }
  if (orgCookie) return orgCookie;

  if (envSlug) {
    const id = await idBySlug(envSlug);
    if (id) return id;
  }

  const { data: anyOrg } = await sb.from("organizations").select("id").limit(1).maybeSingle();
  if (anyOrg?.id) return anyOrg.id;

  throw new Error("No organization available for portal context.");
}

export async function getActiveOrg(sbIn?: Awaited<ReturnType<typeof getServerSupabase>>) {
  const sb = sbIn ?? (await getServerSupabase());
  const org_id = await getPortalOrgId();
  const { data, error } = await sb.from("organizations").select("id, name, slug").eq("id", org_id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Organization not found.");
  return data;
}

/**
 * ensurePortalMember
 * In full auth mode: verify the current user belongs to the org via RLS or membership rows.
 * In staging/demo (no login): allow-through so pages compile & render.
 *
 * Returns the resolved org_id (string).
 */
export async function ensurePortalMember(
  opts?: { orgId?: string; sb?: Awaited<ReturnType<typeof getServerSupabase>> }
): Promise<string> {
  const sb = opts?.sb ?? (await getServerSupabase());
  const org_id = opts?.orgId ?? (await getPortalOrgId());

  // If you want to hard-enforce membership when auth is wired up,
  // switch DEMO_BYPASS off and implement a real check here.
  const DEMO_BYPASS = process.env.NEXT_PUBLIC_PORTAL_DEMO_BYPASS !== "0";
  if (DEMO_BYPASS) return org_id;

  // Example strict check (kept defensive for mixed schemas):
  // Try portal_members first, then org_members as fallback.
  try {
    const { data: pm } = await sb
      .from("portal_members")
      .select("org_id")
      .eq("org_id", org_id)
      .limit(1);
    if (pm && pm.length > 0) return org_id;
  } catch {
    /* ignore */
  }
  try {
    const { data: om } = await sb
      .from("org_members")
      .select("org_id")
      .eq("org_id", org_id)
      .limit(1);
    if (om && om.length > 0) return org_id;
  } catch {
    /* ignore */
  }

  // If we reach here in strict mode, block access.
  throw new Error("Not a member of this organization.");
}

/**
 * getOrgBrand — convenience accessor for branding.
 * Returns defaults if no row exists.
 */
export async function getOrgBrand(
  orgIdIn?: string,
  sbIn?: Awaited<ReturnType<typeof getServerSupabase>>
): Promise<{ org_id: string; logo_url: string | null; brand_voice: string | null; audience?: string | null; notes?: string | null }> {
  const sb = sbIn ?? (await getServerSupabase());
  const org_id = orgIdIn ?? (await getPortalOrgId());
  const { data } = await sb
    .from("org_brand_settings")
    .select("org_id, logo_url, brand_voice, audience, notes")
    .eq("org_id", org_id)
    .maybeSingle();

  return {
    org_id,
    logo_url: data?.logo_url ?? null,
    brand_voice: data?.brand_voice ?? null,
    audience: (data as any)?.audience ?? null,
    notes: (data as any)?.notes ?? null,
  };
}
