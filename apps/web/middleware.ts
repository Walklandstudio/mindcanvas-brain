// apps/web/middleware.ts
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 🔓 Skip public test runner + public APIs
  if (pathname.startsWith('/api/public/')) return;
  if (pathname.startsWith('/t/')) return;

  // ...your existing auth/tenant logic for the rest
}

export const config = {
  // Skip static and public routes; allow everything else
  matcher: [
    '/((?!_next|favicon.ico|assets|.*\\.(png|jpg|svg|css|js)).*)',
  ],
};
