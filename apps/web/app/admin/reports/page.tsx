/* Server component */
import Link from "next/link";
import { cookies } from "next/headers";
import { getServiceClient } from "../../_lib/supabase";

export const dynamic = "force-dynamic";

type Card = {
  id: string;
  name: string;
  frequency: "A" | "B" | "C" | "D";
  blurb: string;
  approved: boolean;
};

export default async function ReportsIndexPage() {
  const sb = getServiceClient();
  const c = await cookies(); // await fixes TS error
  const orgId = c.get("mc_org_id")?.value ?? null;

  if (!orgId) {
    return (
      <main className="p-6 text-white">
        <h1 className="text-2xl font-semibold mb-2">Reports</h1>
        <p className="opacity-80">No org detected. Please complete onboarding.</p>
        <div className="mt-4">
          <Link className="underline" href="/onboarding/create-account">Go to Onboarding</Link>
        </div>
      </main>
    );
  }

  // Framework
  const { data: fw } = await sb
    .from("org_frameworks")
    .select("id")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const frameworkId = fw?.id ?? null;

  // Profiles
  const { data: profiles } = await sb
    .from("org_profiles")
    .select("id,name,frequency,summary")
    .eq("org_id", orgId)
    .eq("framework_id", frameworkId)
    .order("ordinal", { ascending: true });

  const ids = (profiles ?? []).map((p) => p.id);
  const { data: reports } = await sb
    .from("org_profile_reports")
    .select("profile_id, sections, approved")
    .eq("org_id", orgId)
    .eq("framework_id", frameworkId)
    .in("profile_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

  const byId = new Map<string, { sections: any; approved: boolean }>();
  (reports ?? []).forEach((r: any) => byId.set(r.profile_id, { sections: r.sections, approved: !!r.approved }));

  const cards: Card[] = (profiles ?? []).map((p: any) => {
    const rep = byId.get(p.id);
    const blurb =
      (rep?.sections && typeof rep.sections === "object" && (rep.sections as any).summary) ||
      p.summary ||
      "";
    return {
      id: p.id,
      name: p.name,
      frequency: (p.frequency as "A" | "B" | "C" | "D") ?? "A",
      blurb: String(blurb || ""),
      approved: !!rep?.approved,
    };
  });

  return (
    <main className="mx-auto max-w-6xl p-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-white/70">Eight profile reports. Draft → Save → Approve &amp; Lock.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/framework" className="rounded-xl px-4 py-2 bg-white/10 border border-white/15 hover:bg-white/20">
            Back to Framework
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
        {cards.map((card) => (
          <Link
            key={card.id}
            href={`/admin/reports/${card.id}`}
            className="mc-card p-4 hover:bg-white/10 transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">{card.name}</div>
                <p className="mt-2 text-sm text-white/80 line-clamp-2">{card.blurb}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="inline-flex items-center rounded-full border border-white/20 px-2 py-0.5 text-xs">
                  {card.frequency}
                </span>
                {card.approved && (
                  <span className="inline-flex items-center rounded-full bg-emerald-600/20 text-emerald-300 px-2 py-0.5 text-xs">
                    Approved
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {!cards.length && (
        <div className="mt-8 text-white/70">
          No profiles found. Please visit the{" "}
          <Link className="underline" href="/admin/framework">Framework</Link>{" "}
          page to seed your 8 profiles, then click “Generate 8 Reports”.
        </div>
      )}
    </main>
  );
}
