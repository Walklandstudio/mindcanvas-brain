// apps/web/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const config = {
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
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "portal") return null;
  return parts[1] || null;
}

function isPublicPortalRoute(pathname: string) {
  return (
    pathname === "/portal/login" ||
    pathname.startsWith("/portal/login/") ||
    pathname === "/portal/logout" ||
    pathname.startsWith("/portal/logout/") ||
    pathname === "/portal/reset-password" ||
    pathname.startsWith("/portal/reset-password/")
  );
}

async function isSuperAdmin(sb: any, userId: string) {
  const { data, error } = await sb
    .schema("portal")
    .from("superadmin")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;
  return !!data?.user_id;
}

async function getFirstOrgSlug(sb: any, userId: string) {
  // NO created_at column → do NOT order
  const { data: mem, error: mErr } = await sb
    .schema("portal")
    .from("user_orgs")
    .select("org_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (mErr || !mem?.org_id) return null;

  const { data: org, error: oErr } = await sb
    .schema("portal")
    .from("orgs")
    .select("slug")
    .eq("id", mem.org_id)
    .maybeSingle();

  if (oErr) return null;

  const slug = org?.slug;
  return typeof slug === "string" && slug.trim() ? slug.trim() : null;
}

async function userHasOrgAccess(sb: any, userId: string, orgSlug: string) {
  const { data: org, error: oErr } = await sb
    .schema("portal")
    .from("orgs")
    .select("id")
    .eq("slug", orgSlug)
    .maybeSingle();

  if (oErr || !org?.id) return false;

  const { data: mem, error: mErr } = await sb
    .schema("portal")
    .from("user_orgs")
    .select("org_id")
    .eq("user_id", userId)
    .eq("org_id", org.id)
    .limit(1)
    .maybeSingle();

  if (mErr) return false;
  return !!mem?.org_id;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (isPublicPortalRoute(pathname)) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const sb = getSupabase(req, res);
  if (!sb) return res;

  const { data: sessionData } = await sb.auth.getSession();
  const user = sessionData?.session?.user;

  if (!user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/portal/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const userId = user.id;

  if (isAdminPath(pathname)) {
    const ok = await isSuperAdmin(sb, userId);
    if (!ok) {
      const orgSlug = await getFirstOrgSlug(sb, userId);
      const dest = req.nextUrl.clone();
      dest.pathname = orgSlug ? `/portal/${orgSlug}/dashboard` : "/onboarding";
      return NextResponse.redirect(dest);
    }
    return res;
  }

  if (isPortalPath(pathname)) {
    const orgSlug = getOrgSlugFromPortalPath(pathname);

    if (!orgSlug) {
      const first = await getFirstOrgSlug(sb, userId);
      const dest = req.nextUrl.clone();
      dest.pathname = first ? `/portal/${first}/dashboard` : "/onboarding";
      return NextResponse.redirect(dest);
    }

    if (orgSlug === "login") return res;

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
