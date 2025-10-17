// apps/web/app/portal/submissions/page.tsx
import Link from "next/link";
import { ensurePortalMember } from "@/app/_lib/portal";

export const dynamic = "force-dynamic";

export default async function PortalSubmissionsPage() {
  const { supabase, orgId } = await ensurePortalMember();
  const { data } = await supabase
    .from("test_submissions")
    .select("*")
    .eq("org_id", orgId)
    .order("submitted_at", { ascending: false })
    .limit(200);

  const exportUrl = `/app/api/portal/export/submissions.csv?org=${encodeURIComponent(orgId)}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Submissions</h1>
        <a href={exportUrl} className="border rounded px-4 py-2 hover:bg-gray-50 text-sm">Export CSV</a>
      </div>
      <div className="border rounded-lg overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Name / Email</th>
              <th className="px-3 py-2">Test</th>
              <th className="px-3 py-2">Profile</th>
              <th className="px-3 py-2">Flow</th>
              <th className="px-3 py-2">Open</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((s: any) => (
              <tr key={s.id} className="border-t">
                <td className="px-3 py-2">{new Date(s.submitted_at ?? s.created_at).toLocaleString()}</td>
                <td className="px-3 py-2">
                  {s.taker_name ?? "—"} <span className="text-gray-500">{s.taker_email ?? ""}</span>
                </td>
                <td className="px-3 py-2">{s.test_id}</td>
                <td className="px-3 py-2">{s.profile_code ?? "—"}</td>
                <td className="px-3 py-2">{s.flow_code ?? "—"}</td>
                <td className="px-3 py-2">
                  <Link className="underline" href={`/portal/submissions/${s.id}`}>Report</Link>
                </td>
              </tr>
            ))}
            {(!data || data.length === 0) && (
              <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={6}>No submissions yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
