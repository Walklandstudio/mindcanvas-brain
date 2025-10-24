export const dynamic = "force-dynamic";

import dynamicImport from "next/dynamic";
import { createClient } from "@supabase/supabase-js";

const FrequencyPie = dynamicImport(() => import("@/components/charts/FrequencyPie"), { ssr: false });
const ProfileBar  = dynamicImport(() => import("@/components/charts/ProfileBar"), { ssr: false });

async function loadData(token: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );

  const { data: taker } = await supabase
    .from("test_takers")
    .select("id, email, full_name")
    .eq("link_token", token)
    .maybeSingle();

  if (!taker) return null;

  const { data: rep } = await supabase
    .from("test_taker_reports_view")
    .select("*")
    .eq("taker_id", taker.id)
    .maybeSingle();

  return rep;
}

export default async function ReportPage({ params }: { params: { token: string } }) {
  const d = await loadData(params.token);
  if (!d) return <div className="p-6">Report not found.</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Your MindCanvas Report</h1>
        <div className="text-gray-600 text-sm">{d.email}</div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border rounded p-4">
          <div className="font-medium mb-2">Frequency</div>
          <div className="text-sm mb-3">
            Top: <span className="font-semibold">{d.frequency ?? "—"}</span>
          </div>
          <FrequencyPie data={d.freq_scores ?? { A: 0, B: 0, C: 0, D: 0 }} />
        </div>
        <div className="bg-white border rounded p-4">
          <div className="font-medium mb-2">Profile</div>
          <div className="text-sm mb-3">
            Top: <span className="font-semibold">{d.profile ?? "—"}</span>
          </div>
          <ProfileBar data={d.profile_scores ?? {}} />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white border rounded p-4">
          <div className="font-medium mb-2">Strengths</div>
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: d.sections?.strengths ?? "<p>—</p>" }}
          />
        </div>
        <div className="bg-white border rounded p-4">
          <div className="font-medium mb-2">Challenges</div>
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: d.sections?.challenges ?? "<p>—</p>" }}
          />
        </div>
        <div className="bg-white border rounded p-4">
          <div className="font-medium mb-2">Recommendations</div>
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: d.sections?.recommendations ?? "<p>—</p>" }}
          />
        </div>
      </div>
    </div>
  );
}
