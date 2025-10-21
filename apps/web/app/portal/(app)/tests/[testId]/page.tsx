// apps/web/app/portal/(app)/tests/[testId]/page.tsx
import Link from "next/link";
import { getAdminClient, getActiveOrgId } from "@/app/_lib/portal";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TestRow = {
  id: string;
  name: string | null;
  kind?: string | null;
  question_count?: number | null;
  slug?: string | null;
};

async function loadTest(orgId: string, testIdOrSlug: string): Promise<TestRow | null> {
  const sb = getAdminClient();

  // 1) Try org_tests by id
  const { data: byId } = await sb
    .from("org_tests")
    .select("id,name,kind,question_count,slug,org_id")
    .eq("org_id", orgId)
    .eq("id", testIdOrSlug)
    .maybeSingle();

  if (byId) {
    const t: any = byId;
    return {
      id: t.id,
      name: t.name ?? "Untitled",
      kind: t.kind ?? null,
      question_count: t.question_count ?? null,
      slug: t.slug ?? null,
    };
  }

  // 2) Try org_tests by slug
  const { data: bySlug } = await sb
    .from("org_tests")
    .select("id,name,kind,question_count,slug,org_id")
    .eq("org_id", orgId)
    .eq("slug", testIdOrSlug)
    .maybeSingle();

  if (bySlug) {
    const t: any = bySlug;
    return {
      id: t.id,
      name: t.name ?? "Untitled",
      kind: t.kind ?? null,
      question_count: t.question_count ?? null,
      slug: t.slug ?? null,
    };
  }

  // 3) Fallback to legacy tests by id
  const { data: legacyById } = await sb
    .from("tests")
    .select("id,name,kind,question_count,slug,org_id")
    .eq("org_id", orgId)
    .eq("id", testIdOrSlug)
    .maybeSingle();

  if (legacyById) {
    const t: any = legacyById;
    return {
      id: t.id,
      name: t.name ?? "Untitled",
      kind: t.kind ?? null,
      question_count: t.question_count ?? null,
      slug: t.slug ?? null,
    };
  }

  // 4) Legacy by slug
  const { data: legacyBySlug } = await sb
    .from("tests")
    .select("id,name,kind,question_count,slug,org_id")
    .eq("org_id", orgId)
    .eq("slug", testIdOrSlug)
    .maybeSingle();

  if (legacyBySlug) {
    const t: any = legacyBySlug;
    return {
      id: t.id,
      name: t.name ?? "Untitled",
      kind: t.kind ?? null,
      question_count: t.question_count ?? null,
      slug: t.slug ?? null,
    };
  }

  return null;
}

// NOTE: Next 15 PageProps makes `params` async-like → read it via `await props.params`
export default async function TestDetailPage(props: any) {
  const { testId } = (await props.params) as { testId: string };

  const orgId = await getActiveOrgId();
  if (!orgId) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold">Test</h1>
        <p className="mt-2 text-sm text-slate-600">No active organization found.</p>
        <div className="mt-6">
          <Link className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50" href="/portal/tests">
            Back to Tests
          </Link>
        </div>
      </main>
    );
  }

  const test = await loadTest(orgId, testId);

  if (!test) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold">Test</h1>
        <p className="mt-2 text-sm text-slate-600">Test not found in this organization.</p>
        <div className="mt-6">
          <Link className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50" href="/portal/tests">
            Back to Tests
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{test.name}</h1>
          <p className="text-sm text-slate-500">
            {test.kind ?? "test"} · {typeof test.question_count === "number" ? `${test.question_count} questions` : "—"}
          </p>
          <p className="text-xs text-slate-400 mt-1 break-all">
            ID: {test.id}
            {test.slug ? ` · /${test.slug}` : ""}
          </p>
        </div>
        <Link className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50" href="/portal/tests">
          Back to Tests
        </Link>
      </div>

      {/* Placeholder: actions / links */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-black/10 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-700">Invite link</h2>
          <p className="mt-1 text-sm text-slate-600">
            Generate links from the <code>/portal/tests</code> list or via API. (UI coming soon)
          </p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-700">Recent submissions</h2>
          <p className="mt-1 text-sm text-slate-600">This panel will show the latest activity for this test.</p>
        </div>
      </div>
    </main>
  );
}
