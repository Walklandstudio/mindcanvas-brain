// apps/web/app/_lib/admin.ts
import 'server-only';

export function isPlatformAdminEmail(email?: string | null) {
  if (!email) return false;
  const raw = (process.env.PLATFORM_ADMINS || '').trim();
  // TIP: while configuring, you can temporarily relax this by returning true if raw is empty.
  const allow = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return allow.includes(email.toLowerCase());
}
