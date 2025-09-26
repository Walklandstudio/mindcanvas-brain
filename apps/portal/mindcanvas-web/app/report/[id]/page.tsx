// app/report/[id]/page.tsx
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";
import ReportViz from "./ReportViz";

export const dynamic = "force-dynamic";

interface ResultPayload {
  profile?: string | null;
  frequency?: string | null;
  total_score?: number;
  scores?: Record<string, unknown> | null;
  raw?: unknown | null;
}
interface ResultAPI {
  source?: string;
  result?: ResultPayload | null;
  error?: string;
}
interface ProfileContentAPI {
  ok?: boolean;
  content?: {
    code?: string | null;
    name?: string | null;
    frequency?: string | null;
    // any of these keys are optional; we’ll fall back gracefully
    overview?: unknown;
    summary?: unknown;
    description?: unknown;
    strengths?: unknown;
    watchouts?: unknown;
    tips?: unknown;
  } | null;
  error?: string;
}

// ---- helpers ---------------------------------------------------------------

function textify(x: unknown): string | null {
  if (!x) return null;
  if (typeof x === "string") return x;
  try {
    return JSON.stringify(x);
  } catch {
    return String(x);
  }
}
function entriesToNum(rec: Record<string, unknown> | undefined): Record<string, number> {
  if (!rec) return {};
  return Object.fromEntries(
    Object.entries(rec).map(([k, v]) => [k, Number(v) || 0])
  );
}
function topKey(rec: Record<string, number>): string | null {
  let best: string | null = null, val = -Infinity;
  for (const [k, v] of Object.entries(rec)) {
    if (v > val) { val = v; best = k; }
  }
  return best;
}

// Map profile codes → primary Flow (tweak to your taxonomy)
const PROFILE_TO_FLOW: Record<string, "Catalyst" | "Communicator" | "Rhythmic" | "Observer"> = {
  INN: "Catalyst",
  INV: "Catalyst",
  CA:  "Observer",
  TH:  "Observer",
  MM:  "Observer",
  GG:  "Rhythmic",
  HC:  "Communicator",
  NG:  "Communicator",
};

function deriveFlowFromProfiles(profileScores: Record<string, number>): string | null {
  if (!profileScores || Object.keys(profileScores).length === 0) return null;
  // sum scores by mapped flow
  const sums: Record<string, number> = { Catalyst: 0, Communicator: 0, Rhythmic: 0, Observer: 0 };
  for (const [code, score] of Object.entries(profileScores)) {
    const flow = PROFILE_TO_FLOW[code];
    if (flow) sums[flow] = (sums[flow] ?? 0) + (Number(score) || 0);
  }
  return topKey(sums);
}

// ---- page ------------------------------------------------------------------

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // absolute origin for server-side fetches
  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "";
  const origin = base || (host ? `${proto}://${host}` : "");

  // 1) Load computed/saved result JSON
  const resultUrl = `${origin}/api/submissions/${encodeURIComponent(id)}/result`;
  let payload: ResultAPI | null = null;
  let error: string | null = null;
  try {
    const r = await fetch(resultUrl, { cache: "no-store" });
    const j = (await r.json()) as ResultAPI;
    if (!r.ok) error = j?.error ?? `HTTP ${r.status}`;
    else payload = j;
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : String(e);
  }
  if (error) {
    return (
      <main className="p-6 max-w-4xl mx-auto space-y-3">
        <h1 className="text-2xl font-semibold">Report</h1>
        <p className="text-sm text-red-600">Failed to load result: {error}</p>
      </main>
    );
  }

  const r = payload?.result ?? null;

  // 2) Fetch submission meta (first_name, test name)
  const db = supabaseServer();
  const { data: sub } = await db
    .from("mc_submissions")
    .select("first_name,last_name,test_id")
    .eq("id", id)
    .maybeSingle();

  let testName = "Competency Coach";
  if (sub?.test_id) {
    const { data: testRow } = await db
      .from("tests")
      .select("name")
      .eq("id", sub.test_id as string)
      .maybeSingle();
    if (testRow?.name) testName = testRow.name;
  }
  const firstName = (sub?.first_name || "there").trim();

  // 3) Profile content (overview/summary)
  let profileContent: ProfileContentAPI["content"] | null = null;
  if (r?.profile) {
    try {
      const pRes = await fetch(`${origin}/api/profiles/${encodeURIComponent(r.profile)}`, { cache: "no-store" });
      const pJson = (await pRes.json()) as ProfileContentAPI;
      if (pRes.ok && pJson.ok) profileContent = pJson.content ?? null;
    } catch { /* non-fatal */ }
  }
  const overview =
    textify(profileContent?.overview) ||
    textify(profileContent?.summary) ||
    textify(profileContent?.description) ||
    (r?.profile ? `This report summarizes your ${r.profile} profile results and how to use them.` : null);

  // 4) Extract numeric maps for charts + derive frequency if missing
  const scoresObj = (r?.scores as Record<string, unknown> | null) ?? null;
  const profileScores = entriesToNum(
    (scoresObj?.profiles as Record<string, unknown> | undefined)
  );
  const flowScores = entriesToNum(
    (scoresObj?.flows as Record<string, unknown> | undefined)
  );
  const displayFrequency = r?.frequency || deriveFlowFromProfiles(profileScores) || "—";

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Personalized header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Hi {firstName},</h1>
        <h2 className="text-xl">Your {testName} Profile Report</h2>
      </header>

      {/* Welcome / explanation block */}
      {overview && (
        <div className="border rounded-xl p-4">
          <p className="text-sm leading-6 whitespace-pre-wrap">{overview}</p>
        </div>
      )}

      {/* Summary */}
      {!r ? (
        <p>Result pending.</p>
      ) : (
        <div className="grid gap-6">
          <div className="border rounded-xl p-4">
            <h3 className="text-lg font-semibold mb-2">Summary</h3>
            <p>
              Profile: <strong>{r.profile ?? "—"}</strong>
            </p>
            <p>
              Frequency: <strong>{displayFrequency}</strong>
            </p>
            {typeof r.total_score === "number" && (
              <p>
                Total Score: <strong>{r.total_score}</strong>
              </p>
            )}
          </div>

          {/* Charts (pie for flows + primary/aux profiles) */}
          <ReportViz profiles={profileScores} flows={flowScores} />
        </div>
      )}
    </main>
  );
}

