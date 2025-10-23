// apps/web/app/portal/(app)/submissions/page.tsx
import 'server-only';
import { getServerSupabase, getActiveOrgId } from '@/app/_lib/portal';

export const dynamic = 'force-dynamic';

type Submission = {
  id: string;
  created_at: string | null;
  taker_email: string | null;
  taker_name: string | null;
  profile: string | null;
  frequency: string | null;
  total_points: number | null;
  link_token: string | null;
};

export default async function SubmissionsPage() {
  const sb = await getServerSupabase();
  const orgId = await getActiveOrgId(sb);

  if (!orgId) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">Submissions</h1>
        <p className="mt-2 text-sm text-gray-600">No active organization.</p>
      </div>
    );
  }

  const { data, error } = await sb
    .from('test_submissions')
    .select('id, created_at, taker_email, taker_name, profile, frequency, total_points, link_token')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">Submissions</h1>
        <p className="mt-2 text-sm text-red-600">Error: {error.message}</p>
      </div>
    );
  }

  const rows = (data as Submission[] ?? []);
  const csvUrl = '/api/portal/export/submissions.csv';

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Submissions</h1>
        <a
          className="px-3 py-2 rounded-lg border text-sm"
          href={csvUrl}
        >
          Download CSV
        </a>
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-2">When</th>
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Profile</th>
              <th className="p-2">Frequency</th>
              <th className="p-2">Points</th>
              <th className="p-2">Link</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
                <td className="p-2">{r.taker_name || '—'}</td>
                <td className="p-2">{r.taker_email || '—'}</td>
                <td className="p-2">{r.profile || '—'}</td>
                <td className="p-2">{r.frequency || '—'}</td>
                <td className="p-2">{r.total_points ?? '—'}</td>
                <td className="p-2 text-xs break-all">{r.link_token || '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="p-3 text-gray-600" colSpan={7}>No submissions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
