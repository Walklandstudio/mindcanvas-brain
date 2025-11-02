// apps/web/lib/server-url.ts
import { headers } from "next/headers";

/**
 * Always produce an absolute base URL for server-side fetches.
 * Async because next/headers() must be awaited in strict TS mode.
 */
export async function getBaseUrl(): Promise<string> {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL;

  if (envUrl) {
    if (/^https?:\/\//i.test(envUrl)) return envUrl;
    return `https://${envUrl}`;
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}
