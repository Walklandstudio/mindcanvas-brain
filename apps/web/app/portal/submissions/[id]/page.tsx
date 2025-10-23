import React from "react";
import { getAdminClient, getActiveOrgId } from "@/app/_lib/portal";

export const dynamic = "force-dynamic";

type Params = { id: string };

export default async function SubmissionPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id: submissionId } = await params;

  // ✅ MUST await (your error shows sb was still a Promise)
  const sb = await getAdminClient();

  const orgId = await getActiveOrgId(sb);
  if (!orgId) {
    return (
      <main className="p-6 space-y-3">
        <h1 className="text-2xl font-semibold">Submission</h1>
        <p className="text-gray-500">No active organization.</p>
      </main>
    );
  }

  // 1) Load the submission
  const { data: sub, error: subErr } = await sb
    .from("test_submissions")
    .select(
      "id, org_id, test_id, taker_id, submitted_at, driver, raw, completed_at, total_points, profile, frequency"
    )
    .eq("org_id", orgId)
    .eq("id", submissionId)
    .maybeSingle();

  if (subErr || !sub) {
    return (
      <main className="p-6 space-y-3">
        <h1 className="text-2xl font-semibold">Submission</h1>
        <p className="text-red-600">
          {subErr ? subErr.message : "Submission not found."}
        </p>
      </main>
    );
  }

  // 2) Taker
  const { data: taker } = await sb
    .from("test_takers")
    .select("id, email, first_name, last_name, team, company, created_at")
    .eq("org_id", orgId)
    .eq("id", sub.taker_id)
    .maybeSingle();

  // 3) Test meta
  const { data: testMeta } = await sb
    .from("org_tests")
    .select("id, name, slug, mode, status, created_at")
    .eq("org_id", orgId)
    .eq("id", sub.test_id)
    .maybeSingle();

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Submission</h1>

      <section className="rounded-xl border p-4 space-y-2">
        <h2 className="text-lg font-medium">Summary</h2>
        <div className="text-sm text-gray-700 space-y-1">
          <div><span className="font-medium">Submission ID:</span> {sub.id}</div>
          <div><span className="font-medium">Completed:</span> {sub.completed_at ?? "—"}</div>
          <div><span className="font-medium">Total points:</span> {sub.total_points ?? "—"}</div>
          <div><span className="font-medium">Profile:</span> {sub.profile ?? "—"}</div>
          <div><span className="font-medium">Frequency:</span> {sub.frequency ?? "—"}</div>
        </div>
      </section>

      <section className="rounded-xl border p-4 space-y-2">
        <h2 className="text-lg font-medium">Taker</h2>
        <div className="text-sm text-gray-700 space-y-1">
          <div><span className="font-medium">Email:</span> {taker?.email ?? "—"}</div>
          <div><span className="font-medium">Name:</span>{" "}
            {([taker?.first_name ?? "", taker?.last_name ?? ""].join(" ").trim() || "—")}
          </div>
          <div><span className="font-medium">Company:</span> {taker?.company ?? "—"}</div>
          <div><span className="font-medium">Team:</span> {taker?.team ?? "—"}</div>
        </div>
      </section>

      <section className="rounded-xl border p-4 space-y-2">
        <h2 className="text-lg font-medium">Test</h2>
        <div className="text-sm text-gray-700 space-y-1">
          <div><span className="font-medium">Name:</span> {testMeta?.name ?? "—"}</div>
          <div><span className="font-medium">Slug:</span> {testMeta?.slug ?? "—"}</div>
          <div><span className="font-medium">Mode:</span> {testMeta?.mode ?? "—"}</div>
          <div><span className="font-medium">Status:</span> {testMeta?.status ?? "—"}</div>
        </div>
      </section>

      <section className="rounded-xl border p-4 space-y-2">
        <h2 className="text-lg font-medium">Raw</h2>
        <pre className="text-xs overflow-auto bg-gray-50 p-3 rounded-lg">
          {JSON.stringify(sub.raw ?? {}, null, 2)}
        </pre>
      </section>
    </main>
  );
}
