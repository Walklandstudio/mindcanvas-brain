// apps/web/app/portal/[slug]/tests/page.tsx
import { sbAdmin } from '@/lib/supabaseAdmin';
import { resolveOrgBySlug } from '@/lib/resolveOrg';

type TestRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

export default async function TestsPage({ params }: { params: { slug: string } }) {
  const org = await resolveOrgBySlug(params.slug);
  if (!org) return null;

  const { data, error } = await sbAdmin
    .from('portal.v_org_tests')
    .select('id,name,slug,status')
    .eq('org_slug', org.slug)
    .order('name');

  if (error) {
    return <div className="p-6 text-red-300">Error loading tests: {error.message}</div>;
  }

  const tests = (data ?? []) as TestRow[];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tests</h1>
        <a href={`/portal/${org.slug}/tests/new`} className="px-3 py-2 border rounded">New Test</a>
      </div>

      {tests.length === 0 ? (
        <div className="text-white/70">No tests yet.</div>
      ) : (
        <ul className="space-y-2">
          {tests.map(t => (
            <li key={t.id} className="border border-white/10 rounded p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-white/60 uppercase">{t.status}</div>
                </div>
                <a
                  className="underline"
                  href={`/portal/${org.slug}/tests/${t.id}`}
                >
                  Open
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
