// apps/web/app/portal/(app)/home/page.tsx
import React from "react";
import { getAdminClient, getActiveOrgId } from "@/app/_lib/portal";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await getAdminClient();
  const orgId = await getActiveOrgId(supabase);

  if (!orgId) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold">Portal</h1>
        <p className="text-gray-500 mt-2">No active organization.</p>
      </main>
    );
  }

  const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [linksRes, subsRes, subs7Res] = await Promise.all([
    supabase
      .from("test_links")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    supabase
      .from("test_submissions")
      .select("id, submitted_at", { count: "exact" })
      .eq("org_id", orgId),
    supabase
      .from("test_submissions")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("submitted_at", sevenDaysAgoIso),
  ]);

  const linksCount = linksRes.count ?? 0;
  const subsCount = subsRes.count ?? (subsRes.data?.length ?? 0);
  const subs7Count = subs7Res.count ?? 0;

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Portal Overview</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Links" value={linksCount} />
        <StatCard label="Submissions (all time)" value={subsCount} />
        <StatCard label="Submissions (7d)" value={subs7Count} />
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
    </div>
  );
}
