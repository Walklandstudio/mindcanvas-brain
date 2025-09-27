// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const ADMIN_COOKIE = 'admin_token';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const isAdminApiOrPage =
    url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/admin');

  if (!isAdminApiOrPage) return NextResponse.next();

  // Allow the login page itself
  if (url.pathname === '/admin/login') return NextResponse.next();

  // Check cookie
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value ?? '';

  if (!cookie) {
    const loginUrl = new URL('/admin/login', req.url);
    loginUrl.searchParams.set('next', url.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Basic presence check; the session route will set the correct value
  // You can rotate the cookie value by changing ADMIN_DASH_TOKEN.
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
