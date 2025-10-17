// apps/web/app/portal/submissions/[id]/page.tsx
import { ensurePortalMember } from "@/app/_lib/portal";

export const dynamic = "force-dynamic";

export default async function PortalSubmissionDetail({ params }: { params: { id: string } }) {
  const { supabase, orgId } = await ensurePortalMember();
  const { data: s } = await supabase
    .from("test_submissions")
    .select("*")
    .eq("org_id", orgId)
    .eq("id", params.id)
    .maybeSingle();

  if (!s) return <div className="text-red-600">Submission not found.</div>;

  // Reuse your existing report view if you have a component/route.
  // For MVP, just show a simple placeholder and a link to your existing report page if available.
  const reportUrl = `/t/${s.token ?? s.id}/report`; // adjust to your actual route

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Report</h1>
      <div className="text-sm text-gray-600">
        {s.taker_name} &lt;{s.taker_email}&gt; · {new Date(s.submitted_at ?? s.created_at).toLocaleString()}
      </div>
      <iframe src={reportUrl} className="w-full h-[80vh] border rounded" />
      <div>
        <a href={reportUrl} className="underline text-sm">Open full report</a>
      </div>
    </div>
  );
}
