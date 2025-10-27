// apps/web/middleware.ts
export function middleware() { /* your auth logic can live here later */ }

export const config = {
  // Exclude ALL API routes and Next internals to avoid intercepting functions
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
