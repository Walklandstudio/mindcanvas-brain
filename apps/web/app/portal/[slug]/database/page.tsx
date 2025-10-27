// apps/web/app/portal/[slug]/database/page.tsx
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { sbAdmin } from '@/lib/supabaseAdmin';
import { resolveOrgBySlug } from '@/lib/resolveOrg';

type Taker = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  status: string;
  submitted_at: string | null;
  report_ready_at: string | null;
};

export default async function DatabasePage({ params }: { params: { slug: string } }) {
  const org = await resolveOrgBySlug(params.slug);
  if (!org) return null;

  const { data, error } = await sbAdmin
    .from('test_takers')
    .select('id, email, first_name, last_name, status, submitted_at, report_ready_at')
    .eq('org_id', org.id)
    .order('submitted_at', { ascending: false });

  if (error) {
    return <div className="p-6 text-red-300">Error loading database: {error.message}</div>;
  }

  const rows = (data ?? []) as Taker[];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Test Takers</h1>
      {rows.length === 0 ? (
        <div className="text-white/70">No test takers yet.</div>
      ) : (
        <table className="w-full border border-white/10 text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2">Status</th>
              <th className="p-2">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t border-white/10">
                <td className="p-2">
                  <a className="underline" href={`/portal/${org.slug}/database/${r.id}`}>
                    {(r.first_name ?? '') + ' ' + (r.last_name ?? '')}
                  </a>
                </td>
                <td className="p-2">{r.email ?? '—'}</td>
                <td className="p-2 text-center">{r.status}</td>
                <td className="p-2 text-center">{r.submitted_at ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
