// apps/web/app/portal/layout.tsx
import 'server-only';
import { cookies } from 'next/headers';
import { getAdminClient } from '@/app/_lib/portal';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
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
            <a className="underline" href="/admin/clear-view-as">exit</a>
          </div>
        );
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen">
      {banner}
      {children}
    </div>
  );
}
