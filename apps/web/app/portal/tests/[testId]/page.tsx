// apps/web/app/portal/tests/[testId]/page.tsx
import { ensurePortalMember } from "@/app/_lib/portal";

export const dynamic = "force-dynamic";

export default async function PortalTestDetailPage({ params }: { params: { testId: string } }) {
  const { supabase, orgId } = await ensurePortalMember();
  const { data: test } = await supabase
    .from("org_tests")
    .select("*")
    .eq("org_id", orgId)
    .eq("id", params.testId)
    .maybeSingle();

  if (!test) {
    return <div className="text-red-600">Test not found or not accessible.</div>;
  }

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/t/${test.slug ?? test.id}`;
  const iframeSnippet = `<iframe src="${publicUrl}" width="100%" height="800" style="border:0;"></iframe>`;

  const { data: stats } = await supabase
    .from("test_submissions")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("test_id", test.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{test.name ?? test.slug ?? test.id}</h1>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-600">Status</div>
          <div className="text-lg font-medium">{test.status ?? "active"}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-600">Mode</div>
          <div className="text-lg font-medium">{test.mode ?? "full"}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-600">Completed</div>
          <div className="text-lg font-medium">{stats ?? 0}</div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Share</h2>
        <div className="rounded border p-3 bg-gray-50">
          <div className="text-sm">Public URL</div>
          <code className="block break-all text-xs mt-1">{publicUrl}</code>
        </div>
        <div className="rounded border p-3 bg-gray-50 mt-3">
          <div className="text-sm mb-1">Embed (iframe)</div>
          <code className="block break-all text-xs whitespace-pre">{iframeSnippet}</code>
        </div>
      </section>
    </div>
  );
}
