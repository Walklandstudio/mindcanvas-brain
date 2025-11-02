// apps/web/app/portal/submissions/page.tsx
import { getServerSupabase, getActiveOrgId } from '@/app/_lib/portal';

export const dynamic = 'force-dynamic';

export default async function PortalSubmissions() {
  const sb = await getServerSupabase();
  const orgId = await getActiveOrgId(sb);
  if (!orgId) return <p className="p-6">No active org selected.</p>;

  const { data: subs } = await sb
    .from('test_submissions')
    .select('id, created_at, taker_name, taker_email, score_total')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Submissions</h1>
        <a
          href="/api/portal/export/submissions.csv"
          className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
        >
          Download CSV
        </a>
      </div>

      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Name</th>
            <th className="p-2">Email</th>
            <th className="p-2">Score</th>
            <th className="p-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {subs?.map(s => (
            <tr key={s.id} className="border-t">
              <td className="p-2">{s.taker_name}</td>
              <td className="p-2">{s.taker_email}</td>
              <td className="p-2">{s.score_total}</td>
              <td className="p-2">{new Date(s.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
