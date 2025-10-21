// apps/web/app/_lib/portal.ts
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase"; // adjust if your generated types differ

export function supabaseServer() {
  const cookieStore = cookies();
  const h = headers();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
      headers: {
        "x-forwarded-host": h.get("x-forwarded-host") ?? "",
        "x-forwarded-proto": h.get("x-forwarded-proto") ?? "",
        "x-forwarded-for": h.get("x-forwarded-for") ?? "",
      },
    }
  );
}

// get active org via portal_members (first membership wins) or header override
export async function getActiveOrgId() {
  const supabase = supabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return null;

  // optional override: X-Active-Org
  const h = headers();
  const override = h.get("x-active-org");
  if (override) return override;

  const { data: mem } = await supabase
    .from("portal_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  return mem?.org_id ?? null;
}
