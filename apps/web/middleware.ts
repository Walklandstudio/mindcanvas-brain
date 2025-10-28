// apps/web/middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const config = {
  // Match everything; we’ll skip what we don’t want inside the middleware.
  matcher: '/:path*',
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 🔒 Skip static assets & Next internals ASAP (no regex lookaheads here)
  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/assets') ||
    /\.(?:png|jpe?g|svg|gif|webp|ico|css|js|map|txt|woff2?)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 🔓 Public routes that must never be gated by auth
  if (pathname.startsWith('/api/public/')) return NextResponse.next();
  if (pathname.startsWith('/t/')) return NextResponse.next();

  // ✅ Everything else — keep your auth/tenant logic here (or just allow)
  return NextResponse.next();
}
