// apps/web/app/portal/people/page.tsx
import { getServerSupabase, getActiveOrgId } from '@/app/_lib/portal';

export const dynamic = 'force-dynamic';

export default async function PortalPeople() {
  const sb = await getServerSupabase();
  const orgId = await getActiveOrgId(sb);
  if (!orgId) return <p className="p-6">No active org selected.</p>;

  const { data: people } = await sb
    .from('test_takers')
    .select('id, full_name, email, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">People</h1>
      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Name</th>
            <th className="p-2">Email</th>
            <th className="p-2">Joined</th>
          </tr>
        </thead>
        <tbody>
          {people?.map(p => (
            <tr key={p.id} className="border-t">
              <td className="p-2">{p.full_name}</td>
              <td className="p-2">{p.email}</td>
              <td className="p-2">{new Date(p.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
