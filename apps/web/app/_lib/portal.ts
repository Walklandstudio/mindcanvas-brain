// apps/web/app/_lib/portal.ts
import { cookies as getCookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const DEV_BYPASS = process.env.NEXT_PUBLIC_PORTAL_DEV_BYPASS === "true";

// 👇 Replace this with your actual org UUID from Supabase
const DEV_ORG_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Create a Supabase server client using Next.js cookies.
 * Works both for authenticated users and dev-bypass mode.
 */
async function getSupabaseServer() {
  const cookieStore = await getCookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      get(name: string): string | undefined {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions): void {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions): void {
        cookieStore.set({ name, value: "", ...options });
      }
    }
  });
}

/**
 * Returns the org_id for the currently logged-in (or dev-bypassed) user.
 */
export async function getPortalOrgId(): Promise<string> {
  if (DEV_BYPASS) {
    // ⛔ Dev-only: skip auth check
    return DEV_ORG_ID;
  }

  const supabase = await getSupabaseServer();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  if (!user) redirect("/portal/login");

  // Prefer portal_members
  const { data: pm } = await supabase
    .from("portal_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1);

  if (pm && pm.length > 0) return pm[0].org_id as string;

  // Fallback to org_members (admin table)
  const { data: om } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1);

  if (om && om.length > 0) return om[0].org_id as string;

  redirect("/portal/login");
}

/**
 * Ensures the user is logged in and returns the Supabase client + org_id + user.
 * If dev-bypass is enabled, returns fake user data and bypasses auth checks.
 */
export async function ensurePortalMember() {
  if (DEV_BYPASS) {
    const supabase = await getSupabaseServer();
    return {
      supabase,
      orgId: DEV_ORG_ID,
      user: { id: "dev-user", email: "dev@local" } as any
    };
  }

  const supabase = await getSupabaseServer();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) redirect("/portal/login");

  const orgId = await getPortalOrgId();
  return { supabase, orgId, user: authData.user };
}

/**
 * Fetches the org's brand settings (logo, tone, etc.) scoped to the current org.
 */
export async function getOrgBrand(orgId: string) {
  const { supabase } = await ensurePortalMember();
  const { data } = await supabase
    .from("org_brand_settings")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();

  return data ?? null;
}
