export function isPlatformAdminEmail(email?: string | null) {
  if (!email) return false;
  const allow = (process.env.PLATFORM_ADMINS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}
