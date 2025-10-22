import 'server-only';
import { cookies } from 'next/headers';
import { getAdminClient } from '@/app/_lib/portal';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // In Next 15, cookies() may be async-typed
  const jar = await cookies();
  const activeOrgId = jar.get('active_org_id')?.value || null;

  let banner: React.ReactNode = null;

  if (activeOrgId) {
    try {
      const sb = await getAdminClient();
      const { data: org } = await sb
        .from('organizations')
        .select('name, slug')
        .eq('id', activeOrgId)
        .maybeSingle();

      if (org) {
        banner = (
          <div className="bg-amber-100 border-b border-amber-300 text-amber-900 px-4 py-2 text-sm">
            Viewing as: <strong>{org.name}</strong> ({org.slug}) —{' '}
            <a className="underline" href="/admin">
              change
            </a>
          </div>
        );
      }
    } catch {
      // If anything fails (e.g., during static builds), just skip the banner.
    }
  }

  return (
    <div className="min-h-screen">
      {banner}
      {children}
    </div>
  );
}
