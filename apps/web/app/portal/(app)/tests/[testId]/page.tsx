import React from "react";
import { getAdminClient, getActiveOrgId } from "@/app/_lib/portal";

export const dynamic = "force-dynamic";

type Params = { testId: string };

type LinkRow = {
  id: string;
  token: string;
  created_at: string;
  max_uses: number | null;
  uses: number | null;
  mode: string | null;
  kind: string | null;
};

export default async function TestDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { testId: testIdOrSlug } = await params;

  // ✅ await the client factory
  const sb = await getAdminClient();

  const orgId = await getActiveOrgId(sb);
  if (!orgId) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Test</h1>
        <p className="text-gray-600">No active organization.</p>
      </main>
    );
  }

  // Try lookup by UUID, then by slug (both scoped to org)
  const { data: byId } = await sb
    .from("org_tests")
    .select("id,name,slug,mode,status,created_at,org_id")
    .eq("org_id", orgId)
    .eq("id", testIdOrSlug)
    .maybeSingle();

  let test = byId;
  if (!test) {
    const { data: bySlug } = await sb
      .from("org_tests")
      .select("id,name,slug,mode,status,created_at,org_id")
      .eq("org_id", orgId)
      .eq("slug", testIdOrSlug)
      .maybeSingle();
    test = bySlug ?? null;
  }

  if (!test) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Test</h1>
        <p className="text-red-600">
          Test “{testIdOrSlug}” not found for this organization.
        </p>
      </main>
    );
  }

  // Optional: get question count via a HEAD+count query
  const { count: qCount = 0 } = await sb
    .from("test_questions")
    .select("id", { head: true, count: "exact" })
    .eq("org_id", orgId)
    .eq("test_id", test.id);

  // Optional: recent links for this test
  const { data: linksRaw } = await sb
    .from("test_links")
    .select("id, token, created_at, max_uses, uses, mode, kind")
    .eq("org_id", orgId)
    .eq("test_id", test.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // ✅ Narrow null away for TS
  const links: LinkRow[] = linksRaw ?? [];

  return (
    <main className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{test.name}</h1>
        <p className="text-sm text-gray-600">
          slug: <span className="font-mono">{test.slug ?? "—"}</span>
        </p>
      </header>

      <section className="border rounded-xl p-4">
        <h2 className="text-lg font-medium mb-3">Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-gray-500">ID</div>
            <div className="font-mono break-all">{test.id}</div>
          </div>
          <div>
            <div className="text-gray-500">Mode</div>
            <div>{test.mode}</div>
          </div>
          <div>
            <div className="text-gray-500">Status</div>
            <div>{test.status ?? "—"}</div>
          </div>
          <div>
            <div className="text-gray-500">Created</div>
            <div>{new Date(test.created_at).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-gray-500">Questions</div>
            <div>{qCount}</div>
          </div>
        </div>
      </section>

      <section className="border rounded-xl p-4">
        <h2 className="text-lg font-medium mb-3">Recent Links</h2>
        {links.length === 0 ? (
          <p className="text-sm text-gray-600">No links yet.</p>
        ) : (
          <ul className="space-y-2">
            {links.map((l) => (
              <li key={l.id} className="flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-mono">{l.token}</div>
                  <div className="text-gray-500">
                    {new Date(l.created_at).toLocaleString()} • {l.uses}/
                    {l.max_uses ?? "∞"} uses
                  </div>
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">
                  {l.kind ?? l.mode ?? "full"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
