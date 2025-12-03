// apps/web/lib/server-url.ts

/**
 * Returns an absolute base URL that works in:
 * - server components
 * - client components
 * - API routes / route handlers
 * - Vercel builds
 *
 * NO imports from "next/headers" so this file is safe everywhere.
 */
export async function getBaseUrl(): Promise<string> {
  // 1) Browser: use current origin
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // 2) Explicit env vars always win
  const envUrl =
    process.env.NEXT_PUBLIC_APP_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL;

  if (envUrl) {
    // PREVENT double-prefixing (e.g., "https://https://...")
    const url = envUrl.replace(/^https?:\/\//i, "");
    return `https://${url}`;
  }

  // 3) Fallback for local dev
  return "http://localhost:3000";
}

