// apps/web/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const config = {
  matcher: ["/portal/:path*", "/admin/:path*"],
};

function getSupabase(req: NextRequest, res: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, anon, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options)
        );
      },
    },
  });
}

function isPublicPortalRoute(pathname: string) {
  return (
    pathname === "/portal/login" ||
    pathname.startsWith("/portal/login/") ||
    pathname === "/portal/logout" ||
    pathname.startsWith("/portal/logout/")
  );
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Allow public portal routes
  if (isPublicPortalRoute(pathname)) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const sb = getSupabase(req, res);

  const { data } = await sb.auth.getSession();
  const user = data?.session?.user;

  // Not logged in → go to portal login
  if (!user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/portal/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Logged in → allow request
  // Admin permissions handled ONLY in /admin/layout.tsx
  return res;
}
