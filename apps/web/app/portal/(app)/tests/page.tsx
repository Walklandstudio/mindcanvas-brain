// apps/web/app/portal/(app)/tests/page.tsx
import { supabaseServer, getActiveOrgId } from "@/app/_lib/portal";
import GenerateLinkButton from "./GenerateLinkButton";

type OrgTest = {
  id: string;
  name: string;
  slug: string | null;
  mode: string;
  status: string | null;
  created_at: string;
};

async function getTests() {
  const sb = await supabaseServer();
  const orgId = await getActiveOrgId();

  if (!orgId) {
    return { orgId: null as string | null, tests: [] as OrgTest[], error: null as string | null };
  }

  const { data, error } = await sb
    .from("org_tests")
    .select("id, name, slug, mode, status, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return { orgId, tests: [] as OrgTest[], error: error.message };
  }
  return { orgId, tests: (data || []) as OrgTest[], error: null as string | null };
}

export default async function TestsPage() {
  const { orgId, tests, error } = await getTests();

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tests</h1>
      </div>

      <p className="text-sm text-slate-600 mt-1">
        Generate a public link and share it with test takers. Submissions will appear in your dashboard.
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-4">
        {tests.length === 0 && (
          <div className="rounded-lg border p-6 text-sm text-slate-600">
            {orgId
              ? "No tests found for this organization."
              : "No active organization selected. Please switch orgs or re-login."}
          </div>
        )}

        {tests.map((t) => (
          <article key={t.id} className="rounded-xl border border-black/10 bg-white p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-base font-medium">{t.name}</div>
                <div className="text-xs text-slate-500">
                  slug: <code>{t.slug || "—"}</code> · mode: <code>{t.mode}</code>{" "}
                  {t.status ? (
                    <>
                      · status: <code>{t.status}</code>
                    </>
                  ) : null}
                </div>
              </div>
              <GenerateLinkButton testId={t.id} />
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
