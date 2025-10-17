// apps/web/app/portal/submissions/page.tsx
import { getServerSupabase, getActiveOrg } from "@/app/_lib/portal";

export default async function SubmissionsPage() {
  const sb = await getServerSupabase();
  const org = await getActiveOrg(sb);

  const { data } = await sb
    .from("test_submissions")
    .select("id, test_id, taker_name, taker_email, profile, flow, score, submitted_at")
    .eq("org_id", org.id)
    .order("submitted_at", { ascending: false })
    .limit(200);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Submissions — {org.name}</h1>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 text-left text-sm">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Profile</th>
              <th className="p-3">Flow</th>
              <th className="p-3">Score</th>
              <th className="p-3">Date</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(data ?? []).map((r: any) => (
              <tr key={r.id}>
                <td className="p-3">{r.taker_name}</td>
                <td className="p-3">{r.taker_email}</td>
                <td className="p-3">{r.profile}</td>
                <td className="p-3">{r.flow}</td>
                <td className="p-3">{r.score}</td>
                <td className="p-3">{new Date(r.submitted_at).toLocaleString()}</td>
                <td className="p-3">
                  <a className="text-blue-600 hover:underline" href={`/portal/submissions/${r.id}`}>
                    View
                  </a>
                </td>
              </tr>
            ))}
            {(!data || data.length === 0) && (
              <tr>
                <td className="p-3 text-gray-500" colSpan={7}>
                  No submissions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-4">
        <a className="text-blue-600 hover:underline" href="/api/portal/export/submissions.csv">
          Export all (CSV)
        </a>
      </div>
    </div>
  );
}
