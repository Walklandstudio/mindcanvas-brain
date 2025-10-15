import Link from "next/link";
import { cookies } from "next/headers";
import { getServiceClient } from "@/app/_lib/supabase";

export const dynamic = "force-dynamic";

type Profile = {
  id: string;
  name: string;
  frequency: "A" | "B" | "C" | "D";
  image_url: string | null;
  ordinal: number | null;
};

type Sections = {
  summary?: string;
  strengths?: string;
  challenges?: string;
  roles?: string;
  guidance?: string;
};

type Report = {
  profile_id: string;
  sections: Sections | null;
  approved: boolean;
};

function blurbFromSections(sections: Sections | null | undefined): string {
  if (!sections) return "No draft yet — click to generate.";
  const first =
    sections.summary ??
    sections.strengths ??
    sections.roles ??
    sections.guidance ??
    "";
  const text = (first ?? "").toString().trim();
  return text.length > 160 ? text.slice(0, 157) + "…" : text || "No draft yet — click to generate.";
}

export default async function ReportsIndex() {
  // Next 15: cookies() is async in server code
  const cookieStore = await cookies();
  const orgId = cookieStore.get("mc_org_id")?.value ?? null;

  const supabase = getServiceClient();

  if (!orgId) {
    return (
      <main className="p-6 text-white">
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-white/60 mt-2">No org yet. Complete onboarding first.</p>
      </main>
    );
  }

  // Framework (for labels) and id
  const { data: fw } = await supabase
    .from("org_frameworks")
    .select("id, meta")
    .eq("org_id", orgId)
    .maybeSingle();

  const frameworkId: string | null = (fw?.id as string) ?? null;
  const freqNames =
    ((fw?.meta as any)?.frequencies as Record<"A" | "B" | "C" | "D", string> | undefined) ?? null;

  // 8 profiles
  const { data: profs } = await supabase
    .from("org_profiles")
    .select("id, name, frequency, image_url, ordinal")
    .eq("org_id", orgId)
    .order("ordinal", { ascending: true });

  const profiles: Profile[] = (profs as any) ?? [];

  // Existing reports
  const { data: reps } = await supabase
    .from("org_profile_reports")
    .select("profile_id, sections, approved")
    .eq("org_id", orgId)
    .eq("framework_id", frameworkId);

  const byProfile: Record<string, Report> = {};
  for (const r of (reps as any[] | null) ?? []) {
    byProfile[r.profile_id] = {
      profile_id: r.profile_id,
      sections: (r.sections as Sections) ?? null,
      approved: !!r.approved,
    };
  }

  return (
    <main className="p-6 text-white space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Reports</h1>
        <Link
          href="/admin/framework"
          className="text-sm text-sky-300 hover:text-sky-200 underline"
        >
          ← Back to Framework
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {profiles.map((p) => {
          const r = byProfile[p.id];
          const approved = !!r?.approved;
          const freqLabel = freqNames?.[p.frequency] ?? p.frequency;
          return (
            <Link
              key={p.id}
              href={`/admin/reports/${p.id}`}
              className="mc-card p-4 hover:bg-white/10 transition"
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-white/10 overflow-hidden flex items-center justify-center shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="object-cover h-12 w-12"
                    />
                  ) : (
                    <span className="text-white/40 text-xs">no image</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{p.name}</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
                      {p.frequency} · {freqLabel}
                    </span>
                    {approved && (
                      <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-200">
                        Approved
                      </span>
                    )}
                  </div>
                  <p className="text-white/70 text-sm mt-1 line-clamp-2">
                    {blurbFromSections(r?.sections)}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
