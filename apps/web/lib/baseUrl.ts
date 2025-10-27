export function getBaseUrl() {
  // Prefer explicit
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  // Vercel provides this (no protocol)
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`.replace(/\/$/, '');
  // Fallback for local
  return 'http://localhost:3000';
}
