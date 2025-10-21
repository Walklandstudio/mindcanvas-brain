import { getActiveOrgId, supabaseServer } from "@/app/_lib/portal";

export default async function HomePage() {
  const supabase = supabaseServer();
  const orgId = await getActiveOrgId();
  if (!orgId) return <main className="p-6">No organization context.</main>;

  const [links, subs, subs7] = await Promise.all([
    supabase.from("test_links").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    supabase.from("test_submissions").select("id, completed_at", { count: "exact" }).eq("org_id", orgId),
    supabase
      .from("test_submissions")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("started_at", new Date(Date.now() - 7 * 86400_000).toISOString()),
  ]);

  const totalLinks = links.count ?? 0;
  const totalSubs = subs.count ?? 0;
  const completed = (subs.data ?? []).filter((s) => s.completed_at).length;
  const completionRate = totalSubs ? Math.round((completed / totalSubs) * 100) : 0;
  const last7 = subs7.count ?? 0;

  const Card = ({ title, value }: { title: string; value: string | number }) => (
    <div className="rounded-xl border p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Total Links" value={totalLinks} />
        <Card title="Total Submissions" value={totalSubs} />
        <Card title="Completion Rate" value={`${completionRate}%`} />
        <Card title="Last 7 Days" value={last7} />
      </div>
    </main>
  );
}
