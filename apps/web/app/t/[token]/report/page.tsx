"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type AB = "A" | "B" | "C" | "D";

type FrequencyLabel = { code: AB; name: string };
type ProfileLabel = { code: string; name: string };

type ResultData = {
  org_slug: string;
  test_name: string;
  taker: { id: string };
  frequency_labels: FrequencyLabel[];
  frequency_totals: Record<AB, number>;
  frequency_percentages: Record<AB, number>;
  profile_labels: ProfileLabel[];
  profile_totals: Record<string, number>;
  profile_percentages: Record<string, number>;
  top_freq: AB;
  top_profile_code: string;
  top_profile_name: string;
  version: string;
};

type ResultAPI = { ok: boolean; data?: ResultData; error?: string };
type PortalAPI = { ok: boolean; data?: any; error?: string };

function Bar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(1, Number(pct) || 0));
  const width = `${(clamped * 100).toFixed(0)}%`;
  return (
    <div className="w-full h-2 rounded bg-black/10">
      <div className="h-2 rounded bg-sky-600" style={{ width }} />
    </div>
  );
}

export default function ReportPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const sp = useSearchParams();
  const tid = sp?.get("tid") ?? "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [portalData, setPortalData] = useState<any | null>(null);
  const [debugInfo, setDebugInfo] = useState<{
    resultUrl: string;
    portalUrl: string;
    resultErr?: string | null;
    portalErr?: string | null;
  } | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        if (!tid) {
          throw new Error("Missing taker ID (?tid=)");
        }
        setLoading(true);
        setErr("");
        setDebugInfo(null);

        const resultUrl = `/api/public/test/${encodeURIComponent(
          token
        )}/result?tid=${encodeURIComponent(tid)}`;
        const portalUrl = `/api/portal/reports/${encodeURIComponent(
          tid
        )}?json=1`;

        const [resultRes, portalRes] = await Promise.all([
          fetch(resultUrl, { cache: "no-store" }),
          fetch(portalUrl, { cache: "no-store" }),
        ]);

        let resultErr: string | null = null;
        let portalErr: string | null = null;

        // Result API checks
        if (!resultRes.ok) {
          resultErr = `HTTP ${resultRes.status} ${resultRes.statusText}`;
        } else {
          const ct = resultRes.headers.get("content-type") ?? "";
          if (!ct.includes("application/json")) {
            const text = await resultRes.text().catch(() => "");
            resultErr = `Non-JSON response (${resultRes.status}): ${text.slice(
              0,
              200
            )}`;
          }
        }

        // Portal API checks
        if (!portalRes.ok) {
          portalErr = `HTTP ${portalRes.status} ${portalRes.statusText}`;
        } else {
          const ct = portalRes.headers.get("content-type") ?? "";
          if (!ct.includes("application/json")) {
            const text = await portalRes.text().catch(() => "");
            portalErr = `Non-JSON response (${portalRes.status}): ${text.slice(
              0,
              200
            )}`;
          }
        }

        if (resultErr || portalErr) {
          if (alive) {
            setDebugInfo({ resultUrl, portalUrl, resultErr, portalErr });
            setErr("Failed to load one or more report APIs.");
          }
          return;
        }

        const resultJson = (await resultRes.json()) as ResultAPI | any;
        const portalJson = (await portalRes.json()) as PortalAPI | any;

        if (resultJson?.ok === false || !resultJson?.data) {
          if (alive) {
            setErr("Result API returned an error.");
            setDebugInfo({
              resultUrl,
              portalUrl,
              resultErr: JSON.stringify(resultJson),
              portalErr: null,
            });
          }
          return;
        }

        if (portalJson?.ok === false || !portalJson?.data) {
          if (alive) {
            setErr("Portal report API returned an error.");
            setDebugInfo({
              resultUrl,
              portalUrl,
              resultErr: null,
              portalErr: JSON.stringify(portalJson),
            });
          }
          return;
        }

        if (alive) {
          setResultData(resultJson.data as ResultData);
          setPortalData(portalJson.data);
        }
      } catch (e: any) {
        if (alive) setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token, tid]);

  const freq = useMemo(
    () =>
      resultData?.frequency_percentages ?? { A: 0, B: 0, C: 0, D: 0 },
    [resultData]
  );
  const prof = useMemo(
    () => resultData?.profile_percentages ?? {},
    [resultData]
  );

  // Map profile code -> name for nicer display
  const profileNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (resultData?.profile_labels) {
      for (const p of resultData.profile_labels) {
        map[p.code] = p.name;
      }
    }
    return map;
  }, [resultData]);

  // Top 3 profiles by percentage
  const topProfiles = useMemo(() => {
    const entries = Object.entries(prof);
    entries.sort((a, b) => (b[1] || 0) - (a[1] || 0));
    return entries.slice(0, 3).map(([code, pct]) => ({
      code,
      pct,
      name: profileNameMap[code] ?? code,
    }));
  }, [prof, profileNameMap]);

  const sections = portalData?.sections ?? null;

  // Try to get org + taker nicely
  const orgName: string =
    (typeof portalData?.org === "string"
      ? portalData.org
      : portalData?.org?.name) ||
    resultData?.org_slug ||
    "Your organisation";

  const orgLogo: string | null =
    (portalData?.org && typeof portalData.org !== "string"
      ? portalData.org.logo_url ?? null
      : null) ?? null;

  const takerFirst =
    portalData?.taker?.first_name ??
    (resultData as any)?.taker?.first_name ??
    "";
  const takerLast =
    portalData?.taker?.last_name ??
    (resultData as any)?.taker?.last_name ??
    "";
  const takerName =
    `${takerFirst} ${takerLast}`.trim() || "Your profile report";

  const title =
    portalData?.title ||
    portalData?.orgName ||
    orgName ||
    resultData?.test_name ||
    "Your Personalised Report";

  const topName: string =
    resultData?.top_profile_name ||
    portalData?.top_profile_name ||
    "—";

  const topFreqCode: AB | null = resultData?.top_freq ?? null;
  const topFreqLabel =
    topFreqCode && resultData?.frequency_labels
      ? resultData.frequency_labels.find((f) => f.code === topFreqCode)
      : null;

  if (!tid) {
    return (
      <div className="min-h-screen p-6">
        <h1 className="text-2xl font-semibold">Personalised Report</h1>
        <p className="text-destructive mt-4">
          Missing test taker ID. This page expects a{" "}
          <code>?tid=&lt;takerId&gt;</code> query parameter.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <h1 className="text-2xl font-semibold">Loading report…</h1>
      </div>
    );
  }

  if (err || !resultData || !portalData) {
    return (
      <div className="min-h-screen p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Personalised Report</h1>
        <p className="text-destructive mt-4">
          Could not load your report. Please refresh or contact support.
        </p>

        {err && (
          <pre className="mt-2 rounded bg-slate-900 p-3 text-xs text-slate-100 whitespace-pre-wrap">
{err}
          </pre>
        )}

        {debugInfo && (
          <div className="mt-4 rounded-lg border bg-slate-50 p-4 text-xs text-slate-700 space-y-3">
            <p className="font-semibold">Debug information (for developer):</p>

            <div>
              <div className="font-medium">Result API</div>
              <div className="break-all">
                URL: <code>{debugInfo.resultUrl}</code>
              </div>
              <div>Error: {debugInfo.resultErr ?? "none"}</div>
            </div>

            <div>
              <div className="font-medium">Portal report API</div>
              <div className="break-all">
                URL: <code>{debugInfo.portalUrl}</code>
              </div>
              <div>Error: {debugInfo.portalErr ?? "none"}</div>
            </div>

            <p className="mt-2">
              You can open these URLs in a new tab to inspect the raw JSON
              response.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-10 bg-gradient-to-b from-white to-slate-50">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 16mm; }
        }
      `}</style>

      {/* 1. COVER / HERO */}
      <header className="max-w-5xl mx-auto flex flex-col gap-6 md:flex-row md:items-center">
        <div className="flex-1">
          <p className="text-sm text-gray-500">• Personalised report</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">{orgName}</h1>
          <p className="mt-1 text-lg text-gray-700">
            <span className="font-semibold">{takerName}</span>
          </p>
          <p className="mt-1 text-gray-700">
            Top Profile: <span className="font-semibold">{topName}</span>
          </p>

          <div className="no-print mt-4">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-900"
            >
              Download PDF
            </button>
          </div>
        </div>

        {orgLogo && (
          <div className="w-32 h-32 rounded-2xl border bg-white shadow-sm flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={orgLogo}
              alt={`${orgName} logo`}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto mt-10 space-y-10">
        {/* 2. INTRODUCTION */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold">Introduction</h2>
          <p className="text-sm leading-6 text-gray-700">
            This report gives you a personalised view of your natural working
            style using the MindCanvas Profiling System. It combines four
            Frequencies and eight Profiles to describe how you prefer to think,
            decide, and collaborate with others.
          </p>
          <p className="text-sm leading-6 text-gray-700">
            The goal is not to label you, but to provide language for the
            preferences you already use every day. Use this report as a starting
            point for reflection, coaching conversations, and better
            collaboration with your team.
          </p>

          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">
                Frequencies (A–D)
              </h3>
              <ul className="mt-2 text-sm text-gray-700 space-y-1">
                {resultData.frequency_labels.map((f) => (
                  <li key={f.code}>
                    <span className="font-medium">
                      {f.name} ({f.code})
                    </span>
                    {": "}
                    <span className="text-gray-600">
                      Your relative energy in this way of thinking.
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">
                Profiles (P1–P8)
              </h3>
              <p className="mt-2 text-sm text-gray-700">
                Each profile blends the frequencies into a pattern of strengths,
                motivations, and potential blind spots. Your mix across the
                profiles shows how you naturally contribute to a team.
              </p>
            </div>
          </div>
        </section>

        {/* 3. FREQUENCY SUMMARY */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">Frequency summary</h2>
          <p className="text-sm text-gray-700">
            Your strongest overall frequency is{" "}
            <span className="font-semibold">
              {topFreqLabel?.name} ({topFreqLabel?.code})
            </span>
            , which shapes how you approach problems and make decisions. Higher
            percentages indicate where you naturally spend more energy; lower
            percentages highlight areas that may feel less comfortable or more
            draining.
          </p>

          <div className="grid gap-3">
            {resultData.frequency_labels.map((f) => (
              <div key={f.code} className="grid grid-cols-12 items-center gap-3">
                <div className="col-span-3 md:col-span-2 text-sm text-gray-700">
                  <span className="font-medium">{f.name}</span>
                  <span className="text-gray-500 ml-2">({f.code})</span>
                </div>
                <div className="col-span-9 md:col-span-10">
                  <Bar pct={freq[f.code]} />
                  <div className="text-xs text-gray-500 mt-1">
                    {Math.round((freq[f.code] || 0) * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>

          {topFreqLabel && (
            <p className="text-sm text-gray-700">
              With {topFreqLabel.name.toLowerCase()} as a dominant pattern, you
              are likely to feel most confident when you can lean into this way
              of thinking, while the lowest frequency may represent a useful
              stretch or development area.
            </p>
          )}
        </section>

        {/* 4. PROFILE MIX */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Profile mix</h2>
          <div className="grid gap-3">
            {resultData.profile_labels.map((p) => (
              <div key={p.code} className="grid grid-cols-12 items-center gap-3">
                <div className="col-span-3 md:col-span-2 text-sm text-gray-700">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-gray-500 ml-2">
                    ({p.code.replace("PROFILE_", "P")})
                  </span>
                </div>
                <div className="col-span-9 md:col-span-10">
                  <Bar pct={prof[p.code] || 0} />
                  <div className="text-xs text-gray-500 mt-1">
                    {Math.round((prof[p.code] || 0) * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. PROFILE OVERVIEW – TOP 3 */}
        <section className="grid gap-4 md:grid-cols-3">
          {topProfiles.map((p, idx) => (
            <div
              key={p.code}
              className="rounded-2xl border bg-white p-4 shadow-sm flex flex-col gap-2"
            >
              <div className="text-xs uppercase text-gray-500">
                {idx === 0
                  ? "Primary profile"
                  : idx === 1
                  ? "Secondary"
                  : "Tertiary"}
              </div>
              <div className="text-lg font-semibold">{p.name}</div>
              <div className="text-sm text-gray-500">
                ({p.code.replace("PROFILE_", "P")})
              </div>
              <div className="mt-1 text-sm text-gray-700">
                {Math.round((p.pct || 0) * 100)}% match
              </div>
              <p className="mt-2 text-xs text-gray-600">
                This profile represents a key way you show up at work, combining
                your natural energy, decision style, and contribution to others.
              </p>
            </div>
          ))}
        </section>

        {/* 6. STRENGTHS & DEVELOPMENT AREAS */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">
            Strengths & development areas
          </h2>
          <p className="text-sm text-gray-700 mb-4">
            These themes are based on your overall frequency and profile mix.
            Use them as a starting point for reflection, not as fixed labels.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">
                Strengths
              </h3>
              <ul className="mt-2 space-y-2 text-sm text-gray-700">
                <li>
                  You bring strong energy in your{" "}
                  <span className="font-semibold">{topName}</span> profile,
                  which often translates into reliable strengths in this area.
                </li>
                {topFreqLabel && (
                  <li>
                    Your emphasis on{" "}
                    <span className="font-semibold">
                      {topFreqLabel.name.toLowerCase()}
                    </span>{" "}
                    supports decisions and behaviour that align with that
                    pattern.
                  </li>
                )}
                <li>
                  Your spread across the other profiles suggests additional
                  flexibility you can draw on when the situation requires it.
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">
                Development areas
              </h3>
              <ul className="mt-2 space-y-2 text-sm text-gray-700">
                <li>
                  Lower frequencies may point to areas that feel less natural,
                  but can become powerful stretch zones when developed
                  intentionally.
                </li>
                <li>
                  Pay attention to situations where your primary profile might
                  overplay its strengths (for example, moving too quickly,
                  over-analysing, or avoiding conflict).
                </li>
                <li>
                  Coaching conversations can help you decide which behaviours to
                  dial up or down for more impact in your role.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 7. SUMMARY / NARRATIVE */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold">Summary</h2>
          {sections?.summary_text ? (
            <p className="text-sm leading-6 text-gray-700">
              {sections.summary_text}
            </p>
          ) : (
            <p className="text-sm leading-6 text-gray-600">
              Your detailed written narrative will appear here once it has been
              added to the report template for this test. For now, use the
              frequency and profile mix above to reflect on where you feel most
              energised, where you add the most value, and which situations ask
              you to stretch.
            </p>
          )}
        </section>

        {/* 8. TEAM FIT / COLLABORATION – placeholder for future team data */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold">Team fit & collaboration</h2>
          <p className="text-sm text-gray-700">
            When team data is connected for your organisation, this section will
            show how your profile sits alongside your colleagues, including team
            frequency blends and where you naturally complement others.
          </p>
          <p className="text-sm text-gray-600">
            For now, consider which teammates feel very similar to you and which
            feel different. Those differences often hold the key to stronger
            collaboration and shared decision-making.
          </p>
        </section>

        {/* 9. NEXT STEPS / ACTION PLAN */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold">Next steps</h2>
          <p className="text-sm text-gray-700">
            A profile report is most powerful when it turns into conversation
            and action. Use these suggestions to decide what you want to do
            with your insights.
          </p>
          <ul className="mt-2 text-sm text-gray-700 space-y-2">
            <li>• Highlight 2–3 sentences in this report that feel most true.</li>
            <li>• Note one strength you want to lean into more deliberately.</li>
            <li>
              • Note one development area you would like to experiment with over
              the next month.
            </li>
          </ul>

          <div className="no-print mt-4">
            <button className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">
              Talk through this report with your coach
            </button>
          </div>
        </section>
      </main>

      <footer className="max-w-5xl mx-auto py-10 text-sm text-gray-500">
        <div>© {new Date().getFullYear()} MindCanvas — Profiletest.ai</div>
      </footer>
    </div>
  );
}


