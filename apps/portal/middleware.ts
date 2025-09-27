// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const ADMIN_COOKIE = 'admin_token';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const { pathname } = url;

  const isAdminScope =
    pathname.startsWith('/admin') || pathname.startsWith('/api/admin');

  if (!isAdminScope) return NextResponse.next();

  // Always allow the login page and the session endpoint (sets cookie)
  if (pathname === '/admin/login' || pathname === '/api/admin/session') {
    return NextResponse.next();
  }

  // Check cookie is present (value check is optional; middleware is just a gate)
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value ?? '';
  if (!cookie) {
    const loginUrl = new URL('/admin/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
