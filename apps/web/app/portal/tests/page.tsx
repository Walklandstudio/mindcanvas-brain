// apps/web/app/portal/tests/page.tsx
import { getServerSupabase, getActiveOrgId } from '@/app/_lib/portal';
import GenerateLinkButton from './GenerateLinkButton';
import InviteForm from './InviteForm';

export const dynamic = 'force-dynamic';

export default async function PortalTests() {
  const sb = await getServerSupabase();
  const orgId = await getActiveOrgId(sb);

  if (!orgId) return <p className="p-6">No active org selected.</p>;

  const { data: tests } = await sb
    .from('org_tests')
    .select('id, name, slug, status')
    .eq('org_id', orgId);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Tests</h1>

      <div className="grid gap-3">
        {tests?.length ? (
          tests.map(t => (
            <div key={t.id} className="rounded-xl border p-4 flex justify-between items-center">
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-gray-600">{t.slug}</div>
              </div>
              <GenerateLinkButton testSlug={t.slug} />
            </div>
          ))
        ) : (
          <p>No tests found.</p>
        )}
      </div>

      <InviteForm />
    </div>
  );
}
