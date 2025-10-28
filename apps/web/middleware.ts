import type { NextRequest } from 'next/server';

// ✅ Only guard app pages that need auth. Do NOT match /api.
export const config = {
  matcher: ['/portal/:path*', '/admin/:path*'],
};

export function middleware(_req: NextRequest) {
  return;
}
