// apps/web/app/portal/(app)/submissions/[id]/page.tsx
import Link from "next/link";
import { getAdminClient, getActiveOrgId } from "@/app/_lib/portal";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Submission = {
  id: string;
  org_id: string;
  test_id: string | null;
  taker_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_points: number | null;
  frequency: string | null;
  profile: number | null;
};

async function loadSubmission(submissionId: string) {
  const sb = getAdminClient();
  const orgId = await getActiveOrgId();
  if (!orgId)
    return { orgId: null as string | null, sub: null as Submission | null, testName: null as string | null };

  // 1) Get submission (scoped to active org)
  const { data: sub } = await sb
    .from("test_submissions")
    .select("id, org_id, test_id, taker_id, started_at, completed_at, total_points, frequency, profile")
    .eq("org_id", orgId)
    .eq("id", submissionId)
    .maybeSingle();

  if (!sub) return { orgId, sub: null, testName: null };

  // 2) Resolve test name (try org_tests, then legacy tests)
  let testName: string | null = null;

  if (sub.test_id) {
    const { data: ot } = await sb.from("org_tests").select("id,name").eq("id", sub.test_id).maybeSingle();
    if (ot?.name) {
      testName = ot.name as any;
    } else {
      const { data: legacy } = await sb.from("tests").select("id,name").eq("id", sub.test_id).maybeSingle();
      testName = (legacy as any)?.name ?? null;
    }
  }

  return { orgId, sub: sub as Submission, testName };
}

// NOTE: Next 15 PageProps makes `params` async-like → read it via `await props.params`
export default async function SubmissionDetailPage(props: any) {
  const { id } = (await props.params) as { id: string };

  const { orgId, sub, testName } = await loadSubmission(id);

  if (!orgId) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Submission</h1>
        <p className="mt-2 text-sm text-slate-600">No active organization found.</p>
        <div className="mt-6">
          <Link className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50" href="/portal/submissions">
            Back to Submissions
          </Link>
        </div>
      </main>
    );
  }

  if (!sub) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Submission</h1>
        <p className="mt-2 text-sm text-slate-600">Submission not found for this organization.</p>
        <div className="mt-6">
          <Link className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50" href="/portal/submissions">
            Back to Submissions
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Submission</h1>
          <p className="text-sm text-slate-500">ID: {sub.id}</p>
        </div>
        <Link className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50" href="/portal/submissions">
          Back to Submissions
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-black/10 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-700">Test</h2>
          <p className="mt-1 text-slate-900">{testName ?? "Unknown test"}</p>
          <p className="text-xs text-slate-500 break-all">{sub.test_id ?? "—"}</p>
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-700">Taker</h2>
          <p className="mt-1 text-slate-900">{sub.taker_id ?? "—"}</p>
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-700">Timing</h2>
          <p className="mt-1 text-sm">
            <span className="text-slate-500">Started:</span>{" "}
            {sub.started_at ? new Date(sub.started_at).toLocaleString() : "—"}
          </p>
          <p className="text-sm">
            <span className="text-slate-500">Completed:</span>{" "}
            {sub.completed_at ? new Date(sub.completed_at).toLocaleString() : "—"}
          </p>
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-700">Result</h2>
          <p className="mt-1 text-sm">
            <span className="text-slate-500">Total points:</span> {sub.total_points ?? 0}
          </p>
          <p className="text-sm">
            <span className="text-slate-500">Frequency:</span> {sub.frequency ?? "—"}
          </p>
          <p className="text-sm">
            <span className="text-slate-500">Profile:</span> {sub.profile ?? "—"}
          </p>
        </div>
      </div>
    </main>
  );
}
