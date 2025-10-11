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
    return (
      <main className="max-w-4xl mx-auto p-6 text-white">
        Failed to load framework: {fw.error.message}
      </main>
    );
  }

  const profiles = await sb
    .from("org_profiles")
    .select("id,name,frequency,summary,strengths,image_url,ordinal")
    .eq("org_id", ORG_ID)
    .eq("framework_id", fw.data?.id || "")
    .order("ordinal", { ascending: true });

  if (profiles.error) {
    return (
      <main className="max-w-4xl mx-auto p-6 text-white">
        Failed to load profiles: {profiles.error.message}
      </main>
    );
  }

  const freqName = (f: "A" | "B" | "C" | "D") =>
    (fw.data?.frequency_meta as any)?.[f]?.name || `Frequency ${f}`;

  return (
    <main className="max-w-7xl mx-auto p-6 text-white">
      <h1 className="text-2xl font-semibold">Report Sign-off</h1>
      <p className="text-white/70">
        Review the auto-drafted report cards for each profile. This step is to approve structure and tone.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
        {(profiles.data || []).map((p) => (
          <article key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start gap-3">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-lg object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-white/10 grid place-items-center text-sm">
                  {(p.frequency as any) || "?"}
                </div>
              )}
              <div>
                <div className="text-base font-semibold">{p.name}</div>
                <div className="text-xs text-white/60">
                  Frequency {p.frequency}: {freqName(p.frequency as any)}
                </div>
              </div>
            </div>

            {p.summary && <p className="text-sm mt-3 text-white/85">{p.summary}</p>}

            {Array.isArray(p.strengths) && p.strengths.length > 0 && (
              <div className="mt-3">
                <div className="text-sm font-medium mb-1">Strengths</div>
                <ul className="text-sm list-disc list-inside text-white/85">
                  {p.strengths.slice(0, 5).map((s: any, i: number) => (
                    <li key={i}>{String(s)}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 text-xs text-white/50">
              Sections in final report: Overview • Strengths • Challenges • Ideal Roles • Guidance
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div className="text-white/70 text-sm">
          Happy with the structure and tone? Mark as ready and continue to deployment.
        </div>
        <form action="/api/admin/reports/signoff" method="post">
          <button className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-medium">
            Mark Reports Ready →
          </button>
        </form>
      </div>
    </main>
  );
}
