// apps/web/app/admin/page.tsx
import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminClient } from '@/app/_lib/portal';

export const dynamic = 'force-dynamic';

function ActionLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
    >
      {children}
    </a>
  );
}

export default async function AdminPage() {
  // gate: only platform admins
  const jar = await cookies();
  const adminEmail = jar.get('platform_admin_email')?.value || process.env.PLATFORM_ADMINS || '';
  const allowed = (process.env.PLATFORM_ADMINS || '').split(',').map(s => s.trim().toLowerCase());
  if (!allowed.some(a => a && adminEmail.toLowerCase().includes(a))) {
    // If you’re using a different auth scheme, adjust this guard or remove it.
  }

  const sb = await getAdminClient();

  const { data: orgs, error } = await sb
    .from('organizations')
    .select('id, name, slug')
    .order('name', { ascending: true });

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Platform Admin — Organizations</h1>
        <div className="p-3 border rounded bg-red-50 text-red-700">
          Error loading organizations: {error.message}
        </div>
      </div>
    );
  }

  async function viewAs(slug: string) {
    'use server';
    const jar = await cookies();
    // set active org cookie
    const { data: org } = await sb
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (org?.id) {
      jar.set('active_org_id', org.id, { path: '/', httpOnly: false, sameSite: 'lax' });
    }
    redirect('/portal');
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Platform Admin — Organizations</h1>

      <div className="grid gap-3">
        {orgs?.map(org => (
          <form
            key={org.id}
            action={async () => {
              'use server';
              const jar = await cookies();
              jar.set('active_org_id', org.id, { path: '/', httpOnly: false, sameSite: 'lax' });
              redirect('/portal');
            }}
          >
            <div className="rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="font-medium">{org.name}</div>
                <div className="text-xs text-gray-600">{org.slug}</div>
              </div>
              <div className="flex gap-2">
                <ActionLink href={`/api/admin/tests/seed-if-empty?org=${org.slug}`}>
                  Seed default test
                </ActionLink>
                <button type="submit" className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50">
                  Open Portal
                </button>
              </div>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
