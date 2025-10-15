/* Server component */
import Link from "next/link";
import { cookies } from "next/headers";
import { getServiceClient } from "../../_lib/supabase";
import FrameworkClient from "./FrameworkClient";

export const dynamic = "force-dynamic";

export default async function FrameworkPage() {
  const sb = getServiceClient();

  const c = await cookies();
  const orgId: string | null = c.get("mc_org_id")?.value ?? null;

  if (!orgId) {
    return (
      <main className="p-6 text-white">
        <h1 className="text-2xl font-semibold mb-2">Framework</h1>
        <p className="opacity-80">No org detected. Please complete onboarding.</p>
        <div className="mt-4">
          <Link className="underline" href="/onboarding/create-account">Go to Onboarding</Link>
        </div>
      </main>
    );
  }

  // NOTE: only select frequency_meta; older schema doesn't have "meta"
  const { data: fw } = await sb
    .from("org_frameworks")
    .select("id, frequency_meta")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const frameworkId = fw?.id ?? null;
  const legacy = (fw?.frequency_meta as any) || {};
  const frequencyNames: Record<"A" | "B" | "C" | "D", string> = {
    A: legacy?.A?.name ?? "A",
    B: legacy?.B?.name ?? "B",
    C: legacy?.C?.name ?? "C",
    D: legacy?.D?.name ?? "D",
  };

  const { data: profiles } = await sb
    .from("org_profiles")
    .select("id,name,frequency,image_url,ordinal")
    .eq("org_id", orgId)
    .eq("framework_id", frameworkId)
    .order("ordinal", { ascending: true });

  return (
    <main className="mx-auto max-w-6xl p-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Framework</h1>
          <p className="text-white/70">Edit names and images; then draft the 8 profile reports.</p>
        </div>

        {/* Generate reports button */}
        <form action="/api/admin/reports/generate-all" method="post" className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-xl px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white"
          >
            Generate 8 Reports
          </button>
          <Link
            href="/admin/reports"
            className="rounded-xl px-4 py-2 bg-white/10 border border-white/15 hover:bg-white/20"
          >
            Go to Reports
          </Link>
        </form>
      </div>

      <div className="mt-6">
        <FrameworkClient
          orgId={orgId}
          frameworkId={frameworkId}
          initialProfiles={(profiles ?? []) as any}
          initialFrequencies={frequencyNames}
        />
      </div>
    </main>
  );
}
