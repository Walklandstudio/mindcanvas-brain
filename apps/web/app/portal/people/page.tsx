// apps/web/app/portal/(app)/people/page.tsx
import 'server-only';
import { getServerSupabase, getActiveOrgId } from '@/app/_lib/portal';

export const dynamic = 'force-dynamic';

type Taker = {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string | null;
};

export default async function PeoplePage() {
  const sb = await getServerSupabase();
  const orgId = await getActiveOrgId(sb);

  if (!orgId) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">People</h1>
        <p className="mt-2 text-sm text-gray-600">No active organization.</p>
      </div>
    );
  }

  const { data, error } = await sb
    .from('test_takers')
    .select('id, email, name, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">People</h1>
        <p className="mt-2 text-sm text-red-600">Error: {error.message}</p>
      </div>
    );
  }

  const rows = (data as Taker[] ?? []);

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">People</h1>
      <div className="mt-3 rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.name || '—'}</td>
                <td className="p-2">{r.email || '—'}</td>
                <td className="p-2">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="p-3 text-gray-600" colSpan={3}>No people yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
