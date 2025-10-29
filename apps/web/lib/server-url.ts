// apps/web/lib/server-url.ts
import { headers } from "next/headers";

/**
 * Always produce an absolute base URL for server-side fetches.
 * Fixes "Invalid URL" on Vercel and TS error by awaiting headers().
 */
export async function getBaseUrl(): Promise<string> {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL;

  if (envUrl) {
    // If VERCEL_URL has no protocol, add https
    if (/^https?:\/\//i.test(envUrl)) return envUrl;
    return `https://${envUrl}`;
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}
