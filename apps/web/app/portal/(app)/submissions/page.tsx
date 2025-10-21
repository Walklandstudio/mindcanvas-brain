import { getActiveOrgId, supabaseServer } from "@/app/_lib/portal";

export default async function SubmissionsPage() {
  const supabase = supabaseServer();
  const orgId = await getActiveOrgId();
  if (!orgId) return <main className="p-6">No organization context.</main>;

  const { data: rows } = await supabase
    .from("test_submissions")
    .select("id, started_at, completed_at, total_points, frequency, profile, test_id, taker_id")
    .eq("org_id", orgId)
    .order("started_at", { ascending: false })
    .limit(200);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Submissions</h1>
      <div className="rounded-md border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Result</th>
              <th className="px-3 py-2 text-left">Points</th>
              <th className="px-3 py-2 text-left">ID</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{new Date(r.started_at!).toLocaleString()}</td>
                <td className="px-3 py-2">{r.completed_at ? "Completed" : "In progress"}</td>
                <td className="px-3 py-2">{r.frequency ?? "—"} {r.profile ? `· ${r.profile}` : ""}</td>
                <td className="px-3 py-2">{r.total_points ?? 0}</td>
                <td className="px-3 py-2">{r.id}</td>
              </tr>
            ))}
            {(rows ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-gray-500">No submissions yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
