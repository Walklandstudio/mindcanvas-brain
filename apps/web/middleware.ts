import type { NextRequest } from 'next/server';

// ✅ Only protect portal/admin UI, never /api
export const config = {
  matcher: ['/portal/:path*', '/admin/:path*'],
};

export function middleware(_req: NextRequest) {
  return;
}
