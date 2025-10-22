// apps/web/app/portal/(app)/home/page.tsx
import { getServerSupabase, ensurePortalMember } from "@/app/_lib/portal";

/**
 * Server component: Organization dashboard home
 * - Shows counts for links and submissions (total + last 7 days)
 */
export default async function HomePage() {
  // ✅ get a real Supabase client (await!)
  const sb = await getServerSupabase();

  // ✅ ensure the caller is a member; returns the active orgId
  const orgId = await ensurePortalMember(sb);

  // compute date 7 days ago in ISO format
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Run the three count queries in parallel
  const [linksCountRes, allSubsCountRes, subs7dCountRes] = await Promise.all([
    sb
      .from("test_links")
      .select("id", { head: true, count: "exact" })
      .eq("org_id", orgId),

    sb
      .from("test_submissions")
      .select("id", { head: true, count: "exact" })
      .eq("org_id", orgId),

    sb
      .from("test_submissions")
      .select("id", { head: true, count: "exact" })
      .eq("org_id", orgId)
      // Schema shows "submitted_at" (not "completed_at")
      .gte("submitted_at", sevenDaysAgo),
  ]);

  if (linksCountRes.error) throw new Error(linksCountRes.error.message);
  if (allSubsCountRes.error) throw new Error(allSubsCountRes.error.message);
  if (subs7dCountRes.error) throw new Error(subs7dCountRes.error.message);

  const linksCount = linksCountRes.count ?? 0;
  const subsCount = allSubsCountRes.count ?? 0;
  const subs7dCount = subs7dCountRes.count ?? 0;

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Overview</h1>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">Active Links</div>
          <div className="text-3xl font-bold mt-1">{linksCount}</div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">Total Submissions</div>
          <div className="text-3xl font-bold mt-1">{subsCount}</div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">Submissions (7 days)</div>
          <div className="text-3xl font-bold mt-1">{subs7dCount}</div>
        </div>
      </section>
    </main>
  );
}
