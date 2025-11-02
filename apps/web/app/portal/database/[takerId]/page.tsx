export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import FrequencyPie from "@/components/charts/FrequencyPie"; // client component
import ProfileBar from "@/components/charts/ProfileBar";     // client component

async function getData(takerId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase
    .from("test_taker_reports_view")
    .select("*")
    .eq("taker_id", takerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export default async function TakerDetail({ params }: { params: { takerId: string } }) {
  const d = await getData(params.takerId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{d?.full_name ?? "Test Taker"}</h1>
        <div className="text-gray-600 text-sm">{d?.email}</div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border rounded p-4">
          <div className="font-medium mb-2">Frequency</div>
          <div className="text-sm mb-3">
            Top: <span className="font-semibold">{d?.frequency ?? "—"}</span>
          </div>
          <FrequencyPie data={d?.freq_scores ?? { A: 0, B: 0, C: 0, D: 0 }} />
        </div>

        <div className="bg-white border rounded p-4">
          <div className="font-medium mb-2">Profile</div>
          <div className="text-sm mb-3">
            Top: <span className="font-semibold">{d?.profile ?? "—"}</span>
          </div>
          <ProfileBar data={d?.profile_scores ?? {}} />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white border rounded p-4">
          <div className="font-medium mb-2">Strengths</div>
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: d?.sections?.strengths ?? "<p>—</p>" }}
          />
        </div>
        <div className="bg-white border rounded p-4">
          <div className="font-medium mb-2">Challenges</div>
        <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: d?.sections?.challenges ?? "<p>—</p>" }}
          />
        </div>
        <div className="bg-white border rounded p-4">
          <div className="font-medium mb-2">Recommendations</div>
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: d?.sections?.recommendations ?? "<p>—</p>" }}
          />
        </div>
      </div>
    </div>
  );
}
