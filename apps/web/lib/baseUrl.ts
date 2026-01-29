// /apps/web/lib/baseUrl.ts
export function getBaseUrl() {
  const explicit =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.APP_URL;

  if (explicit) return explicit.replace(/\/+$/, "");

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`.replace(/\/+$/, "");

  return "http://localhost:3000";
}

