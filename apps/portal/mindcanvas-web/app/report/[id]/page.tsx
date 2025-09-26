// app/report/[id]/page.tsx
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";
import ReportViz from "./ReportViz";
import FlowBlock from "./FlowBlock";
import ReportHero from "./ReportHero";
import { flowLabelFrom, profileNameFromCode } from "@/lib/profileMeta";
import { getFlowContent, type FlowKey } from "@/lib/flowContent";

export const dynamic = "force-dynamic";

interface ResultPayload {
  profile?: string | null;
  frequency?: string | null;               // 'A' | 'B' | 'R' | 'O'
  total_score?: number;
  scores?: Record<string, unknown> | null; // { profiles: {...}, flows?: {...} }
}
interface ResultAPI { source?: string; result?: ResultPayload | null; error?: string }
interface ProfileContentAPI {
  ok?: boolean;
  content?: {
    code: string; name: string; flow: string | null; overview: string | null;
    strengths: string[]; watchouts: string[]; tips: string[];
    welcome_long: string | null; introduction_long: string | null; competencies_long: string | null;
  } | null;
}

function toNumMap(obj: Record<string, unknown> | undefined): Record<string, number> {
  if (!obj) return {};
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, Number(v) || 0]));
}
function listify(x: unknown): string[] {
  if (!x) return [];
  if (Array.isArray(x)) return x.map(String).filter(Boolean);
  if (typeof x === "string") return x.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  return [];
}
function textify(x: unknown): string {
  if (!x) return "";
  if (typeof x === "string") return x;
  try { return JSON.stringify(x, null, 2); } catch { return String(x); }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Compute base origin for server-side fetch
  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "";
  const origin = base || (host ? `${proto}://${host}` : "");

  // 1) Load computed/saved result
  const res = await fetch(`${origin}/api/submissions/${encodeURIComponent(id)}/result`, { cache: "no-store" });
  const payload = (await res.json()) as ResultAPI;
  const r = res.ok ? (payload?.result ?? null) : null;

  // 2) Submission + org + test for personalization
  const db = supabaseServer();
  const { data: sub } = await db
    .from("mc_submissions")
    .select("first_name,test_id,org_id")
    .eq("id", id)
    .maybeSingle();

  let testName = "Competency Coach";
  if (sub?.test_id) {
    const { data: t } = await db.from("tests").select("name").eq("id", sub.test_id as string).maybeSingle();
    if (t?.name) testName = t.name;
  }

  // NOTE: you said your table is 'organizations'
  let orgName: string | null = null;
  let logoUrl: string | null = null;
  let brandPrimary: string | null = null;
  let brandSecondary: string | null = null;
  if (sub?.org_id) {
    const { data: o } = await db
      .from("organizations")
      .select("brand_name,brand_logo_url,brand_primary_color,brand_secondary_color")
      .eq("id", sub.org_id as string)
      .maybeSingle();
    orgName = (o?.brand_name as string) || null;
    logoUrl = (o?.brand_logo_url as string) || null;
    brandPrimary = (o?.brand_primary_color as string) || null;
    brandSecondary = (o?.brand_secondary_color as string) || null;
  }

  const firstName = (sub?.first_name || "there").trim();

  // 3) Profile longform content
  let overview = "";
  let strengths: string[] = [];
  let watchouts: string[] = [];
  let tips: string[] = [];
  let longWelcome = "";
  let longIntro = "";
  let longCompetencies = "";

  if (r?.profile) {
    const pRes = await fetch(`${origin}/api/profiles/${encodeURIComponent(r.profile)}`, { cache: "no-store" });
    if (pRes.ok) {
      const pj = (await pRes.json()) as ProfileContentAPI;
      const c = pj?.content ?? null;
      if (c) {
        overview = c.overview ?? "";
        strengths = listify(c.strengths);
        watchouts = listify(c.watchouts);
        tips = listify(c.tips);
        longWelcome = textify(c.welcome_long);
        longIntro = textify(c.introduction_long);
        longCompetencies = textify(c.competencies_long);
      }
    }
  }

  // 4) Scores + labels
  const scoresObj     = (r?.scores as Record<string, unknown> | null) ?? null;
  const profileScores = toNumMap(scoresObj?.profiles as Record<string, unknown> | undefined);
  const flowScores    = toNumMap(scoresObj?.flows as Record<string, unknown> | undefined);
  const fullProfile   = profileNameFromCode(r?.profile ?? undefined);
  const flowLabel     = flowLabelFrom(r?.frequency ?? null, profileScores, r?.profile ?? null);
  const flowKey       = (r?.frequency ?? null) as FlowKey | null;

  // 5) Flow copy + colors
  let flowContent = null as Awaited<ReturnType<typeof getFlowContent>> | null;
  if (flowKey) {
    try { flowContent = await getFlowContent(db, flowKey); } catch {/* non-fatal */}
  }

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <ReportHero
        firstName={firstName}
        testName={testName}
        profileName={fullProfile}
        flowDisplay={flowLabel}
        icon={flowContent?.icon}
        color={flowContent?.color}
        bgFrom={flowContent?.bg_from}
        bgTo={flowContent?.bg_to}
        orgName={orgName}
        logoUrl={logoUrl}
        brandPrimary={brandPrimary}
        brandSecondary={brandSecondary}
      />

      {(longWelcome || overview) && (
        <div className="border rounded-xl p-4">
          <h3 className="font-semibold mb-2">Welcome</h3>
          <p className="text-sm leading-6 whitespace-pre-wrap">{longWelcome || overview}</p>
        </div>
      )}

      {!r ? (
        <p>Result pending.</p>
      ) : (
        <div className="grid gap-6">
          <ReportViz profiles={profileScores} flows={flowScores} />

          {flowContent && (
            <FlowBlock
              name={flowContent.name}
              overview={flowContent.overview}
              strengths={flowContent.strengths}
              watchouts={flowContent.watchouts}
              tips={flowContent.tips}
              longform={flowContent.longform}
            />
          )}

          {longIntro && (
            <div className="border rounded-xl p-4">
              <h3 className="font-semibold mb-2">Introduction</h3>
              <div className="text-sm leading-6 whitespace-pre-wrap">{longIntro}</div>
            </div>
          )}

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

          {longCompetencies && (
            <div className="border rounded-xl p-4">
              <h3 className="font-semibold mb-2">Competencies</h3>
              <div className="text-sm leading-6 whitespace-pre-wrap">{longCompetencies}</div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

