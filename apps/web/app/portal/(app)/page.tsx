// apps/web/app/portal/(app)/page.tsx
import 'server-only';
import { getServerSupabase, getActiveOrgId } from '@/app/_lib/portal';

export const dynamic = 'force-dynamic';

export default async function PortalHome() {
  const sb = await getServerSupabase();
  const orgId = await getActiveOrgId(sb);

  if (!orgId) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Portal</h1>
        <p className="mt-2 text-sm text-gray-600">No active organization.</p>
      </div>
    );
  }

  const [{ count: testsCount }, { count: peopleCount }, { count: subsCount }] = await Promise.all([
    sb.from('org_tests').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    sb.from('test_takers').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    sb.from('test_submissions').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
  ]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Portal</h1>

      <div className="grid sm:grid-cols-3 gap-3">
        <a href="/portal/tests" className="rounded-xl border p-4 hover:bg-gray-50">
          <div className="text-3xl font-semibold">{testsCount ?? 0}</div>
          <div className="text-sm text-gray-600">Tests</div>
        </a>
        <a href="/portal/people" className="rounded-xl border p-4 hover:bg-gray-50">
          <div className="text-3xl font-semibold">{peopleCount ?? 0}</div>
          <div className="text-sm text-gray-600">People</div>
        </a>
        <a href="/portal/submissions" className="rounded-xl border p-4 hover:bg-gray-50">
          <div className="text-3xl font-semibold">{subsCount ?? 0}</div>
          <div className="text-sm text-gray-600">Submissions</div>
        </a>
      </div>

      <div className="rounded-xl border p-4">
        <div className="font-medium">Quick actions</div>
        <ul className="list-disc pl-5 text-sm mt-2 space-y-1">
          <li><a className="underline" href="/portal/tests">Create & copy invite link</a></li>
          <li><a className="underline" href="/portal/submissions">Download CSV</a></li>
          <li><a className="underline" href="/admin/clear-view-as">Exit “view as”</a></li>
        </ul>
      </div>
    </div>
  );
}
