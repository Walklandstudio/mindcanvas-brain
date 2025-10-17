// apps/web/app/portal/submissions/[id]/page.tsx
import { getServerSupabase, getActiveOrg } from "@/app/_lib/portal";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = await getServerSupabase();
  const org = await getActiveOrg(sb);

  const { data, error } = await sb
    .from("test_submissions")
    .select("id, test_id, taker_name, taker_email, profile, flow, score, submitted_at, report_json")
    .eq("org_id", org.id)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Submission not found</h1>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Submission — {data.taker_name}</h1>
      <div className="rounded-lg border p-4 space-y-2">
        <div><b>Email:</b> {data.taker_email}</div>
        <div><b>Profile:</b> {data.profile}</div>
        <div><b>Flow:</b> {data.flow}</div>
        <div><b>Score:</b> {data.score}</div>
        <div><b>Date:</b> {new Date(data.submitted_at).toLocaleString()}</div>
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="font-medium mb-2">Report</h2>
        <pre className="text-sm overflow-x-auto">
{JSON.stringify(data.report_json ?? {}, null, 2)}
        </pre>
      </div>

      <div>
        <a className="text-blue-600 hover:underline" href="/portal/submissions">← Back to Submissions</a>
      </div>
    </div>
  );
}
