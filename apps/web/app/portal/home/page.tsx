// apps/web/app/portal/home/page.tsx
import { ensurePortalMember } from "@/app/_lib/portal";

export const dynamic = "force-dynamic";

export default async function PortalHomePage() {
  const { supabase, orgId } = await ensurePortalMember();

  const [{ data: tests }, { data: subs }] = await Promise.all([
    supabase.from("org_tests").select("*").eq("org_id", orgId).limit(100),
    supabase
      .from("test_submissions")
      .select("*")
      .eq("org_id", orgId)
      .order("submitted_at", { ascending: false })
      .limit(10),
  ]);

  const totalTests = tests?.length ?? 0;
  const totalSubs = (await supabase.from("test_submissions").select("id", { count: "exact", head: true }).eq("org_id", orgId)).count ?? 0;
  const totalTakers = (await supabase.from("test_takers").select("id", { count: "exact", head: true }).eq("org_id", orgId)).count ?? 0;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-600">Tests</div>
          <div className="text-2xl font-semibold">{totalTests}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-600">Invited People</div>
          <div className="text-2xl font-semibold">{totalTakers}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-600">Total Submissions</div>
          <div className="text-2xl font-semibold">{totalSubs}</div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Recent submissions</h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Name / Email</th>
                <th className="px-3 py-2">Test</th>
                <th className="px-3 py-2">Profile</th>
                <th className="px-3 py-2">Flow</th>
              </tr>
            </thead>
            <tbody>
              {(subs ?? []).map((s: any) => (
                <tr key={s.id} className="border-t">
                  <td className="px-3 py-2">{new Date(s.submitted_at ?? s.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    {s.taker_name ?? "—"} <span className="text-gray-500">{s.taker_email ?? ""}</span>
                  </td>
                  <td className="px-3 py-2">{s.test_id}</td>
                  <td className="px-3 py-2">{s.profile_code ?? "—"}</td>
                  <td className="px-3 py-2">{s.flow_code ?? "—"}</td>
                </tr>
              ))}
              {(!subs || subs.length === 0) && (
                <tr>
                  <td className="px-3 py-6 text-center text-gray-500" colSpan={5}>No submissions yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
