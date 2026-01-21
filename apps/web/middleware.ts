// apps/web/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const config = {
  // Protect org portal + admin portal
  matcher: ["/portal/:path*", "/admin/:path*", "/dashboard/:path*"],
};

function getSupabase(req: NextRequest, res: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

  if (!url || !anon) return null as any;

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          res.cookies.set(name, value, options);
        }
      },
    },
  });
}

function isAdminPath(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  );
}

function isPortalPath(pathname: string) {
  return pathname === "/portal" || pathname.startsWith("/portal/");
}

function getOrgSlugFromPortalPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean); // ["portal", "{orgSlug}", ...]
  if (parts[0] !== "portal") return null;
  return parts[1] || null;
}

async function getFirstOrgSlug(sb: any, userId: string) {
  const { data, error } = await sb
    .schema("portal")
    .from("user_orgs")
    .select("orgs:org_id ( slug )")
    .eq("user_id", userId)
    .limit(1);

  if (error) return null;
  const slug = data?.[0]?.orgs?.slug;
  return typeof slug === "string" && slug.trim() ? slug.trim() : null;
}

async function userHasOrgAccess(sb: any, userId: string, orgSlug: string) {
  const { data, error } = await sb
    .schema("portal")
    .from("user_orgs")
    .select("id, orgs:org_id ( slug )")
    .eq("user_id", userId)
    .limit(100);

  if (error) return false;

  return (data || []).some((r: any) => r?.orgs?.slug === orgSlug);
}

async function isSuperAdmin(sb: any, userId: string) {
  // ✅ Your actual table: portal.superadmins
  const { data, error } = await sb
    .schema("portal")
    .from("superadmins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;
  return !!data?.user_id;
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const sb = getSupabase(req, res);
  if (!sb) return res;

  const { data: sessionData } = await sb.auth.getSession();
  const user = sessionData?.session?.user;
  const pathname = req.nextUrl.pathname;

  // Not logged in → send to login for protected routes
  if (!user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const userId = user.id;

  // ✅ Admin portal protection: superadmins only
  if (isAdminPath(pathname)) {
    const ok = await isSuperAdmin(sb, userId);

    if (!ok) {
      const orgSlug = await getFirstOrgSlug(sb, userId);
      const dest = req.nextUrl.clone();
      dest.pathname = orgSlug ? `/portal/${orgSlug}/dashboard` : "/onboarding";
      return NextResponse.redirect(dest);
    }

    return res; // superadmin allowed
  }

  // ✅ Portal protection: must belong to org
  if (isPortalPath(pathname)) {
    const orgSlug = getOrgSlugFromPortalPath(pathname);

    // /portal → redirect to first org dashboard
    if (!orgSlug) {
      const first = await getFirstOrgSlug(sb, userId);
      const dest = req.nextUrl.clone();
      dest.pathname = first ? `/portal/${first}/dashboard` : "/onboarding";
      return NextResponse.redirect(dest);
    }

    // /portal/[slug]/... → enforce membership
    const ok = await userHasOrgAccess(sb, userId, orgSlug);
    if (!ok) {
      const first = await getFirstOrgSlug(sb, userId);
      const dest = req.nextUrl.clone();
      dest.pathname = first ? `/portal/${first}/dashboard` : "/onboarding";
      return NextResponse.redirect(dest);
    }

    return res;
  }

  return res;
}

