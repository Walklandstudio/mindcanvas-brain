// middleware.js
import { NextResponse } from 'next/server';

const ADMIN_COOKIE = 'admin_token';

export function middleware(req) {
  const { pathname } = req.nextUrl;

  const inAdminScope =
    pathname.startsWith('/admin') || pathname.startsWith('/api/admin');

  if (!inAdminScope) return NextResponse.next();

  // Always allow login page, session setter, and debug endpoint
  if (
    pathname === '/admin/login' ||
    pathname === '/api/admin/session' ||
    pathname === '/api/admin/debug'
  ) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(ADMIN_COOKIE)?.value || '';
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

