// apps/web/app/portal/tests/page.tsx
import { getServerSupabase, getActiveOrgId } from '@/app/_lib/portal';
import GenerateLinkButton from './GenerateLinkButton';
import InviteForm from './InviteForm';

export const dynamic = 'force-dynamic';

type TestRow = { id: string; name: string; slug: string; status: string | null };

export default async function PortalTests() {
  const sb = await getServerSupabase();
  const orgId = await getActiveOrgId(sb);
  if (!orgId) return <div className="p-6">No active org selected.</div>;

  const { data: tests, error } = await sb
    .from('org_tests')
    .select('id, name, slug, status')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    return <div className="p-6 text-red-600">Error: {error.message}</div>;
  }

  const rows = (tests as TestRow[]) ?? [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Tests</h1>

      {rows.length === 0 ? (
        <div className="rounded-xl border p-4 bg-amber-50 text-amber-900">
          <div className="font-medium">No tests found for this organization.</div>
          <div className="text-sm mt-1">
            Seed a test (e.g. <code>team-puzzle-profile</code>) and refresh this page.
          </div>
        </div>
      ) : (
        <>
          {/* Per-test quick link creation */}
          <div className="grid gap-3">
            {rows.map(t => (
              <div
                key={t.id}
                className="rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-gray-600">{t.slug}</div>
                </div>
                <GenerateLinkButton testSlug={t.slug} />
              </div>
            ))}
          </div>

          {/* Email invite with test picker; shows the link after creation */}
          <InviteForm tests={rows} />
        </>
      )}
    </div>
  );
}
