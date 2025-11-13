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

  const title =
    portalData?.title ||
    portalData?.orgName ||
    (typeof portalData?.org === "string"
      ? portalData.org
      : portalData?.org?.name) ||
    resultData?.test_name ||
    "Your Personalised Report";

  const topName: string =
    resultData?.top_profile_name ||
    portalData?.top_profile_name ||
    "—";

  const sections = portalData?.sections ?? null;

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

      <header className="max-w-5xl mx-auto">
        <p className="text-sm text-gray-500">
          {resultData.org_slug} • Personalised report
        </p>
        <h1 className="text-3xl md:text-4xl font-bold mt-1">{title}</h1>
        <p className="text-gray-700 mt-2">
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
      </header>

      <main className="max-w-5xl mx-auto mt-8 space-y-10">
        {/* Frequency mix (same structure as result page) */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Frequency mix</h2>
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
        </section>

        {/* Profile mix (same structure as result page) */}
        <section>
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

        {/* Narrative / raw data from portal report API */}
        {sections ? (
          <section className="rounded-2xl border p-6 text-sm space-y-4 bg-white shadow-sm">
            <div>
              <h3 className="font-semibold mb-1">Frequencies (raw)</h3>
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(sections.frequencies ?? {}, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Profiles (raw)</h3>
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(sections.profiles ?? {}, null, 2)}
              </pre>
            </div>
            {sections.summary_text ? (
              <div>
                <h3 className="font-semibold mb-1">Summary</h3>
                <p className="leading-6">{sections.summary_text}</p>
              </div>
            ) : null}
          </section>
        ) : (
          <section className="rounded-2xl border p-6 bg-white shadow-sm">
            <p className="text-sm text-gray-600">
              Your detailed written report content will appear here once it has
              been attached by the report API.
            </p>
          </section>
        )}
      </main>

      <footer className="max-w-5xl mx-auto py-10 text-sm text-gray-500">
        <div>© {new Date().getFullYear()} MindCanvas — Profiletest.ai</div>
      </footer>
    </div>
  );
}


