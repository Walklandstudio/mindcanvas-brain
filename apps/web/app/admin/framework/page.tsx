/* Server component: Framework landing with frequency chips + profile cards */
import Link from "next/link";
import { cookies } from "next/headers";
import { getServiceClient } from "../../_lib/supabase";
import FrameworkClient from "./FrameworkClient";

export const dynamic = "force-dynamic";

export default async function FrameworkPage() {
  const sb = getServiceClient();
  const c = await cookies();               // ⬅️ await here
  const orgId = c.get("mc_org_id")?.value ?? null;

  if (!orgId) {
    return (
      <main className="mx-auto max-w-6xl p-6 text-white">
        <h1 className="text-2xl font-semibold">Framework</h1>
        <p className="text-white/70 mt-1">
          No org detected yet. Please complete onboarding first.
        </p>
        <div className="mt-4">
          <Link className="underline" href="/onboarding/create-account">
            Go to Onboarding
          </Link>
        </div>
      </main>
    );
  }

  const { data: fwRows } = await sb
    .from("org_frameworks")
    .select("id, frequency_meta")
    .eq("org_id", orgId)
    .limit(1);

  const fw = Array.isArray(fwRows) ? fwRows[0] : fwRows ?? null;
  const frameworkId = fw?.id ?? null;

  const legacy = (fw?.frequency_meta as any) || {};
  const freqNames: Record<"A" | "B" | "C" | "D", string> = {
    A: legacy?.A?.name ?? "A",
    B: legacy?.B?.name ?? "B",
    C: legacy?.C?.name ?? "C",
    D: legacy?.D?.name ?? "D",
  };

  const { data: profiles = [] } = await sb
    .from("org_profiles")
    .select("id,name,frequency,image_url,ordinal,summary,strengths")
    .eq("org_id", orgId)
    .eq("framework_id", frameworkId)
    .order("ordinal", { ascending: true });

  return (
    <main className="mx-auto max-w-6xl p-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Framework</h1>
          <p className="text-white/70">
            Frequencies and profiles are generated from your onboarding data.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <form action="/api/admin/framework/generate" method="post">
            <button
              className="rounded-2xl px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white"
              type="submit"
            >
              Generate from Onboarding
            </button>
          </form>
          <Link
            href="/admin/reports"
            className="rounded-2xl px-4 py-2 bg-white/10 border border-white/15 hover:bg-white/20"
          >
            Go to Reports
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <FrameworkClient
          orgId={orgId}
          frameworkId={frameworkId}
          initialProfiles={profiles as any}
          initialFrequencies={freqNames}
        />
      </div>
    </main>
  );
}
