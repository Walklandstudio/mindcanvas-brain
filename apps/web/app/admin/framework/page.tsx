// apps/web/app/admin/framework/page.tsx
import { getServiceClient } from "../../_lib/supabase";

export const dynamic = "force-dynamic";

export default async function FrameworkPage() {
  const supabase = getServiceClient();
  const orgId = "00000000-0000-0000-0000-000000000001";

  const { data: fw } = await supabase
    .from("org_frameworks")
    .select("id,name,version,created_at")
    .eq("org_id", orgId)
    .maybeSingle();

  const frameworkId = fw?.id ?? "—";

  const { data: profiles } = await supabase
    .from("org_profiles")
    .select("id,name,frequency,ordinal")
    .eq("org_id", orgId)
    .eq("framework_id", fw?.id ?? "")
    .order("ordinal", { ascending: true });

  return (
    <main className="max-w-3xl mx-auto p-6 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Framework</h1>
        <form action="/api/admin/framework/reseed" method="post">
          <button className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-medium">
            Seed / Reseed
          </button>
        </form>
      </div>

      <div className="mt-4 text-white/80">
        <div>Framework ID: <span className="font-mono">{frameworkId}</span></div>
        <div>Name: {fw?.name ?? "—"} | Version: {fw?.version ?? "—"}</div>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Profiles</h2>
        {!profiles?.length ? (
          <p className="text-white/70">No profiles yet. Click “Seed / Reseed”.</p>
        ) : (
          <ul className="divide-y divide-white/10 border border-white/10 rounded-xl">
            {profiles.map((p) => (
              <li key={p.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.ordinal}. {p.name}</div>
                  <div className="text-white/70 text-sm">Frequency {p.frequency}</div>
                </div>
                <div className="text-white/60 text-sm font-mono">{p.id}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
