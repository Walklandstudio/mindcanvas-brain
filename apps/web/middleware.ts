// apps/web/middleware.ts
import type { NextRequest } from 'next/server';

// ✅ DO NOT match /api at all. Only guard app pages:
export const config = {
  matcher: [
    '/portal/:path*',
    '/admin/:path*',
  ],
};

export function middleware(_req: NextRequest) {
  // No auth yet. Return immediately.
  return;
}
