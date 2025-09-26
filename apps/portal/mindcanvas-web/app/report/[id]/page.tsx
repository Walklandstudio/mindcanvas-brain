import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";
import ReportViz from "./ReportViz";
import { profileNameFromCode, flowLabelFrom } from "@/lib/profileMeta";

export const dynamic = "force-dynamic";

interface ResultPayload {
  profile?: string | null;
  frequency?: string | null;                 // may be A/B/C/D or null
  total_score?: number;
  scores?: Record<string, unknown> | null;   // { profiles: {P1: n, ...}, flows?: {...} }
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
    overview?: unknown;
    summary?: unknown;
    description?: unknown;
    strengths?: unknown;
    watchouts?: unknown;
    tips?: unknown;
  } | null;
}

function textify(x: unknown): string | null {
  if (!x) return null;
  if (typeof x === "string") return x;
  try { return JSON.stringify(x); } catch { return String(x); }
}
function toNumMap(obj: Record<string, unknown> | undefined): Record<string, number> {
  if (!obj) return {};
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, Number(v) || 0]));
}
function listify(x: unknown): string[] {
  if (!x) return [];
  if (Array.isArray(x)) return x.map(String).filter(Boolean);
  if (typeof x === "string") return x.split(/\r?\n|,/).map(s => s.trim()).filter(Boolean);
  return [];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "";
  const origin = base || (host ? `${proto}://${host}` : "");

  // 1) load computed/saved result
  const res = await fetch(`${origin}/api/submissions/${encodeURIComponent(id)}/result`, { cache: "no-store" });
  const payload = (await res.json()) as ResultAPI;
  const r = res.ok ? (payload?.result ?? null) : null;

  // 2) submission meta for greeting
  const db = supabaseServer();
  const { data: sub } = await db
    .from("mc_submissions")
    .select("first_name,test_id")
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

  // 3) profile content copy
  let overview = "";
  let strengths: string[] = [];
  let watchouts: string[] = [];
  let tips: string[] = [];
  if (r?.profile) {
    const pRes = await fetch(`${origin}/api/profiles/${encodeURIComponent(r.profile)}`, { cache: "no-store" });
    if (pRes.ok) {
      const pj = (await pRes.json()) as ProfileContentAPI;
      const c = pj?.content;
      overview  = textify(c?.overview) || textify(c?.summary) || textify(c?.description) || "";
      strengths = listify(c?.strengths);
      watchouts = listify(c?.watchouts);
      tips      = listify(c?.tips);
    }
  }

  // 4) numeric maps + pretty labels
  const scoresObj     = (r?.scores as Record<string, unknown> | null) ?? null;
  const profileScores = toNumMap(scoresObj?.profiles as Record<string, unknown> | undefined);
  const flowScores    = toNumMap(scoresObj?.flows as Record<string, unknown> | undefined);
  const fullProfile   = profileNameFromCode(r?.profile ?? undefined);
  const flowLabel = flowLabelFrom(r?.frequency ?? null, profileScores, r?.profile ?? null);
  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Greeting */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Hi {firstName},</h1>
        <h2 className="text-xl">Your {testName} Profile Report</h2>
      </header>

      {/* Welcome / explanation from profile content */}
      {overview && (
        <div className="border rounded-xl p-4">
          <p className="text-sm leading-6 whitespace-pre-wrap">{overview}</p>
        </div>
      )}

      {!r ? (
        <p>Result pending.</p>
      ) : (
        <div className="grid gap-6">
          {/* Summary */}
          <div className="border rounded-xl p-4">
            <h3 className="text-lg font-semibold mb-2">Summary</h3>
            <p>Profile: <strong>{fullProfile}</strong></p>
            <p>Coaching Flow: <strong>{flowLabel}</strong></p>
            {typeof r.total_score === "number" && <p>Total Score: <strong>{r.total_score}</strong></p>}
          </div>

          {/* Visuals */}
          <ReportViz profiles={profileScores} flows={flowScores} />

          {/* Content sections */}
          {(strengths.length || watchouts.length || tips.length) > 0 && (
            <div className="border rounded-xl p-4 grid gap-4">
              {strengths.length > 0 && (
                <section>
                  <h4 className="font-semibold mb-1">Strengths</h4>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </section>
              )}
              {watchouts.length > 0 && (
                <section>
                  <h4 className="font-semibold mb-1">Watch-outs</h4>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {watchouts.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </section>
              )}
              {tips.length > 0 && (
                <section>
                  <h4 className="font-semibold mb-1">Tips</h4>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {tips.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

