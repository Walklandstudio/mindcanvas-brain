// apps/web/app/portal/(app)/tests/page.tsx
import { getAdminClient, getActiveOrgId } from "@/app/_lib/portal";
import Link from "next/link";

type LinkRow = {
  id: string;
  token: string;
  uses: number;
  max_uses: number | null;
  mode?: string | null;
  kind?: string | null;
  created_at: string | null;
  test_id: string;
  test_name?: string | null;
};

export const dynamic = "force-dynamic";

export default async function TestsPage() {
  const sb = await getAdminClient();
  const orgId = await getActiveOrgId(sb);

  if (!orgId) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold">Tests</h1>
        <p className="text-gray-500 mt-2">No active organization selected.</p>
        <p className="text-sm mt-2">
          Go to <Link href="/admin" className="underline">Admin</Link> and set an active org.
        </p>
      </main>
    );
  }

  // Pull links + test name
  const { data, error } = await sb
    .from("test_links")
    .select("id, token, uses, max_uses, mode, kind, created_at, test_id")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  const rows: LinkRow[] = (data ?? []) as any[];

  // Get test names for convenience
  if (rows.length) {
    const testIds = Array.from(new Set(rows.map(r => r.test_id)));
    const { data: tests } = await sb
      .from("org_tests")
      .select("id, name")
      .in("id", testIds);
    const nameById = new Map((tests ?? []).map(t => [t.id, t.name as string]));
    for (const r of rows) r.test_name = nameById.get(r.test_id) ?? null;
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Test Links</h1>
          <p className="text-gray-500">Create and manage shareable links for your tests.</p>
        </div>
        <Link
          href="/portal/home"
          className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-gray-900 hover:bg-gray-100"
        >
          Portal Home
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
          {error.message}
        </div>
      )}

      <div className="rounded-xl border bg-white">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-gray-500">
          <div className="col-span-3">Test</div>
          <div className="col-span-3">Link</div>
          <div className="col-span-2">Usage</div>
          <div className="col-span-2">Created</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        <div className="divide-y">
          {(rows ?? []).map((r) => {
            const uses = r.uses ?? 0;
            const cap  = r.max_uses ?? "∞";
            const href = `/t/${encodeURIComponent(r.token)}`;

            const created = r.created_at
              ? new Date(r.created_at).toLocaleString()
              : "—";

            return (
              <div key={r.id} className="grid grid-cols-12 items-center gap-2 px-4 py-3">
                <div className="col-span-3">
                  <div className="font-medium">{r.test_name ?? r.test_id}</div>
                  <div className="text-xs text-gray-500">
                    {r.mode || r.kind ? `${r.mode || r.kind}` : ""}
                  </div>
                </div>

                <div className="col-span-3">
                  <div className="text-sm">
                    <a className="underline" href={href} target="_blank" rel="noreferrer">
                      {href}
                    </a>
                  </div>
                  <div className="text-xs text-gray-500">token: {r.token}</div>
                </div>

                <div className="col-span-2 text-sm">
                  {uses} / {cap}
                </div>

                <div className="col-span-2 text-sm">
                  {created}
                </div>

                <div className="col-span-2">
                  <form
                    action="/api/portal/links/delete"
                    method="post"
                    className="flex justify-end"
                  >
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                      title="Delete link"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            );
          })}

          {rows.length === 0 && (
            <div className="px-4 py-8 text-sm text-gray-500">No links yet.</div>
          )}
        </div>
      </div>
    </main>
  );
}
