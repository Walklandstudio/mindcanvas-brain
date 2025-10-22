// apps/web/app/portal/(app)/tests/page.tsx
import 'server-only';
import { getServerSupabase, getActiveOrgId } from '@/app/_lib/portal';
import GenerateLinkButton from './GenerateLinkButton';

type OrgTest = {
  id: string;
  name: string;
  slug: string;
  mode?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export const dynamic = 'force-dynamic';

export default async function TestsPage() {
  const sb = await getServerSupabase();
  const orgId = await getActiveOrgId(sb);

  if (!orgId) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">Tests</h1>
        <p className="mt-2 text-sm text-gray-600">
          No active organization. If you’re a platform admin, set one at <a className="underline" href="/admin">/admin</a>.
        </p>
      </div>
    );
  }

  const { data: tests, error } = await sb
    .from('org_tests')
    .select('id, name, slug, mode, status, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">Tests</h1>
        <p className="mt-2 text-sm text-red-600">Error loading tests: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold">Tests</h1>

      <div className="grid gap-3">
        {(tests as OrgTest[] ?? []).map((t) => (
          <div key={t.id} className="rounded-xl border p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-gray-600">{t.slug}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {t.mode ?? '—'} · {t.status ?? '—'}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Create & Copy Link for this test */}
                <GenerateLinkButton testSlug={t.slug} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {(!tests || tests.length === 0) && (
        <p className="text-sm text-gray-600">No tests yet.</p>
      )}
    </div>
  );
}
