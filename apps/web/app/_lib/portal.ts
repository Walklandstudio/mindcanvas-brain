// apps/web/app/_lib/portal.ts
import { cookies as getCookies, headers as getHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

async function getSupabaseServer() {
  const cookieStore = await getCookies();
  const h = await getHeaders();

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
    },
    headers: {
      "x-forwarded-host": h.get("x-forwarded-host") ?? "",
      "x-forwarded-proto": h.get("x-forwarded-proto") ?? ""
    }
  });
}

export async function getPortalOrgId(): Promise<string> {
  const supabase = await getSupabaseServer();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) redirect("/portal/login");

  const { data: pm } = await supabase
    .from("portal_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1);

  if (pm && pm.length > 0) return pm[0].org_id as string;

  const { data: om } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1);

  if (om && om.length > 0) return om[0].org_id as string;

  redirect("/portal/login");
}

export async function ensurePortalMember() {
  const supabase = await getSupabaseServer();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) redirect("/portal/login");
  const orgId = await getPortalOrgId();
  return { supabase, orgId, user: authData.user };
}

export async function getOrgBrand(orgId: string) {
  const { supabase } = await ensurePortalMember();
  const { data } = await supabase
    .from("org_brand_settings")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();
  return data ?? null;
}
