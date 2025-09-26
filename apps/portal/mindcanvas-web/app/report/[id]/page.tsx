// app/report/[id]/page.tsx
import { headers } from "next/headers";
import ReportHero from "./ReportHero";
import ReportViz from "./ReportViz";
import PdfButton from "./PdfButton";
import { supabaseServer } from "@/lib/supabaseServer";
import type { ProfileKey, FlowLabel } from "@/lib/profileImages";

export const dynamic = "force-dynamic";

type PageProps = { params: { id: string } };

type ResultPayload = {
  profile?: string | null;                 // expected P1..P8; if not present we infer from scores
  frequency?: string | null;               // optional
  total_score?: number | null;
  scores?: {
    profiles?: Record<string, number>;
    flows?: Record<string, number>;
  } | null;
};

type ResultAPI = {
  ok?: boolean;
  result?: ResultPayload | null;
  error?: string;
  source?: string;
};

type ProfileContentAPI = {
  ok?: boolean;
  content?: {
    code: string;
    name: string;
    flow: string | null;
    overview: string | null;
    strengths: string[] | null;
    watchouts: string[] | null;
    tips: string[] | null;
    welcome_long: string | null;
    introduction_long: string | null;
    competencies_long: string | null;
  } | null;
};

// helper: narrow unknown objects to numeric maps
function toNumMap<T extends string>(obj: unknown, keys?: readonly T[]): Partial<Record<T, number>> {
  const out: Partial<Record<T, number>> = {};
  if (!obj || typeof obj !== "object") return out;
  if (keys) {
    for (const k of keys) {
      const v = (obj as Record<string, unknown>)[k];
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isNaN(n) && n !== 0) out[k] = n;
    }
  } else {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isNaN(n) && n !== 0) (out as Record<string, number>)[k] = n;
    }
  }
  return out;
}

const PROFILE_KEYS: ProfileKey[] = ["P1","P2","P3","P4","P5","P6","P7","P8"];
const FLOW_LABELS: FlowLabel[] = [
  "Catalyst Coaching Flow",
  "Communications Coaching Flow",
  "Rhythmic Coaching Flow",
  "Observer Coaching Flow",
];

export default async function Page({ params }: PageProps) {
  const { id } = params;

  // Compute absolute origin for internal API calls (works locally & on Vercel)
  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
    `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  // 1) Load computed/saved result JSON for this submission
  const res = await fetch(`${origin}/api/submissions/${encodeURIComponent(id)}/result`, {
    cache: "no-store",
  });
  const json = (await res.json()) as ResultAPI;
  const r = res.ok ? json.result ?? null : null;

  // 2) Submission meta (for greeting) via Supabase
  const db = supabaseServer();
  const { data: sub } = await db
    .from("mc_submissions")
    .select("first_name")
    .eq("id", id)
    .maybeSingle();

  const firstName = (sub?.first_name || "there").trim();

  // 3) Normalize scores (profiles P1..P8; flows by long labels if present)
  const rawProfiles = r?.scores?.profiles ?? {};
  const rawFlows    = r?.scores?.flows ?? {};

  const profileScores = toNumMap<ProfileKey>(rawProfiles, PROFILE_KEYS);
  const flowScores    = toNumMap<FlowLabel>(rawFlows, FLOW_LABELS);

  // Decide main profile code:
  let mainProfile: ProfileKey | null = (r?.profile && PROFILE_KEYS.includes(r.profile as ProfileKey))
    ? (r?.profile as ProfileKey)
    : null;
  if (!mainProfile) {
    // infer from highest profile score
    let best: ProfileKey | null = null;
    let bestVal = -1;
    for (const k of PROFILE_KEYS) {
      const v = profileScores[k] ?? 0;
      if (v > bestVal) { best = k; bestVal = v; }
    }
    mainProfile = best;
  }

  // 4) Fetch rich profile content (welcome/introduction/etc.) if we have a code
  let welcomeLong: string | null = null;
  let introductionLong: string | null = null;
  if (mainProfile) {
    const pRes = await fetch(`${origin}/api/profiles/${mainProfile}`, { cache: "no-store" });
    if (pRes.ok) {
      const pJson = (await pRes.json()) as ProfileContentAPI;
      welcomeLong = pJson?.content?.welcome_long ?? null;
      introductionLong = pJson?.content?.introduction_long ?? null;
    }
  }

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6" id="report-root">
      <div className="flex justify-end">
        <PdfButton />
      </div>

      <ReportHero
        firstName={firstName}
        profileCode={mainProfile}
        welcomeLong={welcomeLong}
        introductionLong={introductionLong}
      />

      <ReportViz
        profileScores={profileScores}
        flowScores={Object.keys(flowScores).length ? flowScores : undefined}
        mainProfile={mainProfile ?? undefined}
      />
    </main>
  );
}

