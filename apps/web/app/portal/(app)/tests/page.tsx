// apps/web/app/portal/(app)/tests/page.tsx
import Link from "next/link";
import { getAdminClient, getActiveOrgId } from "@/app/_lib/portal";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TestRow = {
  id: string;
  name: string | null;
  kind?: string | null;
  question_count?: number | null;
};

async function fetchTests(): Promise<{ orgId: string | null; tests: TestRow[] }> {
  const sb = getAdminClient();

  // Find an active org (shim returns first membership if user id is not provided)
  const orgId = await getActiveOrgId();
  if (!orgId) return { orgId: null, tests: [] };

  // Try the new table first
  const { data: orgTests, error: orgErr } = await sb
    .from("org_tests")
    .select("id, name, kind, question_count")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (!orgErr && orgTests && orgTests.length > 0) {
    return {
      orgId,
      tests: orgTests.map((t: any) => ({
        id: t.id,
        name: t.name ?? "Untitled",
        kind: t.kind ?? null,
        question_count: t.question_count ?? null,
      })),
    };
  }

  // Fallback to legacy `tests` schema if org_tests is empty or missing
  const { data: legacy, error: legacyErr } = await sb
    .from("tests")
    .select("id, name, kind, question_count, org_id")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (legacyErr || !legacy) return { orgId, tests: [] };

  return {
    orgId,
    tests: legacy.map((t: any) => ({
      id: t.id,
      name: t.name ?? "Untitled",
      kind: t.kind ?? null,
      question_count: t.question_count ?? null,
    })),
  };
}

export default async function TestsPage() {
  const { orgId, tests } = await fetchTests();

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Tests</h1>
          <p className="text-sm text-slate-500">
            {orgId ? "Listing tests for your active organization." : "No active organization found."}
          </p>
        </div>
        {/* Placeholder for future actions */}
        <div className="text-sm text-slate-400"> </div>
      </div>

      {(!orgId || tests.length === 0) && (
        <div className="mt-8 rounded-xl border border-black/10 bg-white p-6">
          <p className="text-slate-600">
            {orgId
              ? "No tests found for this organization."
              : "Please ensure your account is a member of at least one organization."}
          </p>
        </div>
      )}

      {orgId && tests.length > 0 && (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tests.map((t) => (
            <li key={t.id} className="rounded-xl border border-black/10 bg-white p-4">
              <div className="flex items-start justify-between">
                <h2 className="font-medium leading-tight">{t.name}</h2>
                <span className="rounded-md border px-2 py-0.5 text-xs text-slate-600">
                  {t.kind ?? "test"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {typeof t.question_count === "number"
                  ? `${t.question_count} questions`
                  : "Questions: –"}
              </p>
              <div className="mt-3">
                <Link
                  href={`/portal/tests/${t.id}`}
                  className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  Open
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
