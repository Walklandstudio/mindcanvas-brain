// apps/web/app/admin/reports/signoff/page.tsx
import { getServiceClient } from "../../../_lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

export default async function Page() {
  const sb = getServiceClient();

  const fw = await sb
    .from("org_frameworks")
    .select("id, name, version, frequency_meta")
    .eq("org_id", ORG_ID)
    .maybeSingle();

  if (fw.error) {
    return <main className="max-w-4xl mx-auto p-6 text-white">Failed to load framework: {fw.error.message}</main>;
  }

  const profiles = await sb
    .from("org_profiles")
    .select("id,name,frequency,summary,strengths,image_url,ordinal")
    .eq("org_id", ORG_ID)
    .eq("framework_id", fw.data?.id || "")
    .order("ordinal", { ascending: true });

  if (profiles.error) {
    return <main className="max-w-4xl mx-auto p-6 text-white">Failed to load profiles: {profiles.error.message}</main>;
  }

  const approvals = await sb
    .from("org_profile_reports")
    .select("profile_id,approved")
    .in("profile_id", (profiles.data || []).map((p) => p.id));

  const approvedMap = Object.fromEntries((approvals.data || []).map((r: any) => [r.profile_id, r.approved]));

  const freqName = (f: "A" | "B" | "C" | "D") =>
    (fw.data?.frequency_meta as any)?.[f]?.name || `Frequency ${f}`;

  return (
    <main className="max-w-7xl mx-auto p-6 text-white">
      <h1 className="text-2xl font-semibold">Report Builder</h1>
      <p className="text-white/70">Draft and edit profile report sections. Use AI to create first drafts.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
        {(profiles.data || []).map((p) => (
          <a
            key={p.id}
            href={`/admin/reports/${p.id}`}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
          >
            <div className="flex items-start gap-3">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-lg object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-white/10 grid place-items-center text-sm">
                  {(p.frequency as any) || "?"}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-base font-semibold">{p.name}</div>
                  {approvedMap[p.id] ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Approved
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/15">
                      Draft
                    </span>
                  )}
                </div>
                <div className="text-xs text-white/60">Frequency {p.frequency}: {freqName(p.frequency as any)}</div>
              </div>
            </div>

            {p.summary && <p className="text-sm mt-3 text-white/85 line-clamp-3">{p.summary}</p>}
          </a>
        ))}
      </div>
    </main>
  );
}
