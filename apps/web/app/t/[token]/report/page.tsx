"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getOrgFramework } from "@/lib/report/getOrgFramework";

type FrequencyCode = "A" | "B" | "C" | "D";

type FrequencyLabel = { code: FrequencyCode; name: string };
type ProfileLabel = { code: string; name: string };

type PublicResultData = {
  org_slug: string;
  test_name: string;
  taker: { id: string };
  frequency_labels: FrequencyLabel[];
  frequency_percentages: Record<FrequencyCode, number>;
  profile_labels: ProfileLabel[];
  profile_percentages: Record<string, number>;
  top_freq: FrequencyCode;
  top_profile_code: string; // "PROFILE_3"
  top_profile_name: string; // "Motivator"
};

type PortalReportData = {
  title?: string;
  org?: { id: string; slug?: string | null; name?: string | null };
  taker?: { id: string; first_name?: string | null; last_name?: string | null };
  latestResult?: {
    totals?: {
      frequencies?: Record<string, number>;
      profiles?: Record<string, number>;
    };
  };
  colors?: { primary?: string; text?: string };
  sections?: any;
  top_profile_name?: string;
};

type ApiEnvelope<T> = { ok: boolean; data: T; error?: string };

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string; debug?: any }
  | { status: "ready"; result: PublicResultData; portal: PortalReportData; debug?: any };

async function fetchJson(url: string) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    const ct = res.headers.get("content-type") ?? "";
    const json = ct.includes("application/json") ? JSON.parse(text) : { raw: text };

    if (!res.ok || json?.ok === false) {
      return {
        ok: false as const,
        status: res.status,
        error:
          json?.error ||
          (ct.includes("text/html")
            ? `Non-JSON HTML response (status ${res.status}).`
            : text.slice(0, 300)),
        raw: json,
      };
    }

    return { ok: true as const, status: res.status, data: json };
  } catch (e: any) {
    return { ok: false as const, status: 0, error: String(e?.message || e) };
  }
}

function Bar({ pct }: { pct: number }) {
  const value = Number.isFinite(pct) ? pct : 0;
  const clamped = Math.max(0, Math.min(1, value));
  const width = `${(clamped * 100).toFixed(0)}%`;

  return (
    <div className="w-full h-2 rounded bg-slate-200">
      <div className="h-2 rounded bg-sky-600" style={{ width }} />
    </div>
  );
}

export default function ReportPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const searchParams = useSearchParams();

  const tid = searchParams?.get("tid") ?? "";
  const debugFlag = searchParams?.get("debug") === "1";

  const [state, setState] = useState<FetchState>({ status: "idle" });

  useEffect(() => {
    if (!tid) return;

    let alive = true;

    (async () => {
      setState({ status: "loading" });

      const resultUrl = `/api/public/test/${encodeURIComponent(
        token
      )}/result?tid=${encodeURIComponent(tid)}`;
      const portalUrl = `/api/portal/reports/${encodeURIComponent(tid)}?json=1`;

      const [resultRes, portalRes] = await Promise.all([
        fetchJson(resultUrl),
        fetchJson(portalUrl),
      ]);

      const debugPayload = {
        resultUrl,
        portalUrl,
        resultRes,
        portalRes,
      };

      if (!alive) return;

      if (!resultRes.ok || !portalRes.ok) {
        const msg =
          (!resultRes.ok && resultRes.error) ||
          (!portalRes.ok && portalRes.error) ||
          "Unknown error";

        setState({ status: "error", message: msg, debug: debugPayload });
        return;
      }

      const resultEnvelope = resultRes.data as ApiEnvelope<PublicResultData>;
      const portalEnvelope = portalRes.data as ApiEnvelope<PortalReportData>;

      setState({
        status: "ready",
        result: (resultEnvelope.data as any) as PublicResultData,
        portal: (portalEnvelope.data as any) as PortalReportData,
        debug: debugPayload,
      });
    })();

    return () => {
      alive = false;
    };
  }, [token, tid]);

  // Handle missing tid
  if (!tid) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Personalised report</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          This page expects a <code>?tid=</code> query parameter referencing the test taker.
        </p>
      </div>
    );
  }

  // Debug view
  if (debugFlag && (state.status === "error" || state.status === "ready")) {
    return (
      <div className="mx-auto max-w-4xl p-6 space-y-4">
        <h1 className="text-2xl font-semibold mb-2">Report Debug</h1>
        <pre className="rounded-lg border bg-slate-950 text-slate-50 text-xs p-4 overflow-x-auto">
          {JSON.stringify(
            {
              status: state.status,
              error: state.status === "error" ? state.message : undefined,
              debug: state.debug,
            },
            null,
            2
          )}
        </pre>
      </div>
    );
  }

  if (state.status === "loading" || state.status === "idle") {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Personalised report</h1>
        <p className="mt-4 text-sm text-muted-foreground">Loading your report…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Personalised report</h1>
        <p className="mt-4 text-sm text-destructive">
          Could not load your report. Please refresh or contact support.
        </p>
        <pre className="mt-4 rounded bg-slate-950 text-slate-50 text-xs p-3 whitespace-pre-wrap">
          {state.message}
        </pre>
      </div>
    );
  }

  // Ready state
  const { result, portal } = state;

  const orgSlug = portal.org?.slug || result.org_slug;
  const orgName = portal.org?.name || result.org_slug || "Your organisation";

  const framework = getOrgFramework(orgSlug);

  const topFreqCode = result.top_freq;
  const freqLabelsByCode = useMemo(
    () => Object.fromEntries(result.frequency_labels.map((f) => [f.code, f.name] as const)),
    [result.frequency_labels]
  );
  const topFreqName = freqLabelsByCode[topFreqCode] ?? topFreqCode;

  const freqDef = framework?.frequencies?.find((f) => f.code === topFreqCode);
  const dominantFreqSummary =
    freqDef?.summary ||
    `Your strongest overall frequency is ${topFreqName}, which represents how you naturally direct your energy at work.`;

  const topProfileCode = result.top_profile_code;
  const topProfileLabel =
    result.profile_labels.find((p) => p.code === topProfileCode)?.name ||
    result.top_profile_name;

  const profileNumericCode = topProfileCode?.startsWith("PROFILE_")
    ? topProfileCode.replace("PROFILE_", "")
    : topProfileCode;

  const profileDef = framework?.profiles?.find((p) => p.code === profileNumericCode);

  const topProfileSummary =
    profileDef?.summary ||
    `This profile reflects how you prefer to contribute, collaborate, and create momentum in your work.`;

  const traits: string[] =
    (profileDef && (profileDef as any).traits) ||
    (profileDef && (profileDef as any).strengths) ||
    [];
  const motivators: string[] =
    (profileDef && (profileDef as any).motivators) ||
    (profileDef && (profileDef as any).drivers) ||
    [];
  const blindSpots: string[] =
    (profileDef && ((profileDef as any).blind_spots || (profileDef as any).risks)) || [];

  const takerName = `${portal.taker?.first_name ?? ""} ${
    portal.taker?.last_name ?? ""
  }`.trim();

  const freqPct = result.frequency_percentages;
  const profilePct = result.profile_percentages;

  const portalReportDownloadUrl = `/api/portal/reports/${encodeURIComponent(tid)}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 md:py-10 space-y-6 md:space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Personalised report
          </p>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold text-slate-900">
                {orgName ?? "Your report"}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {takerName && (
                  <>
                    For <span className="font-medium">{takerName}</span>
                  </>
                )}{" "}
                {topProfileLabel && (
                  <>
                    &middot; Top profile:{" "}
                    <span className="font-medium">{topProfileLabel}</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </header>

        {/* About the test / system – org-branded */}
        <section className="rounded-2xl border bg-white p-6 md:p-7 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">About this profiling system</h2>
          <p className="text-sm leading-relaxed text-slate-700">
            This report is based on{" "}
            <span className="font-medium">{orgName}</span>&apos;s profiling framework. It is
            designed to give you language for your natural working style, the patterns you lean on
            most often, and the areas that may require more conscious effort.
          </p>
          <p className="text-sm leading-relaxed text-slate-700">
            You can use this report to reflect on how you make decisions, how you collaborate with
            others, and which environments bring out your best work. It is not a verdict on who you
            are, but a starting point for conversations about strengths, stretch areas, and growth.
          </p>

          <div className="grid gap-6 md:grid-cols-2 text-sm">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Frequencies</h3>
              <p className="text-slate-700">
                The framework uses four Frequencies to describe the energy you bring to your work:
              </p>
              <ul className="mt-2 space-y-1 text-slate-700">
                <li>
                  <span className="font-medium">Innovation</span>: Ideas, creation, momentum;
                  future-focused and possibility-driven.
                </li>
                <li>
                  <span className="font-medium">Influence</span>: Relationships, communication,
                  motivation, and activation.
                </li>
                <li>
                  <span className="font-medium">Implementation</span>: Rhythm, process, and reliable
                  delivery.
                </li>
                <li>
                  <span className="font-medium">Insight</span>: Pattern recognition, analysis, and
                  perspective.
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Profiles</h3>
              <p className="text-slate-700">
                The eight Profiles blend these Frequencies into distinct patterns of strengths,
                motivations, and potential blind spots. Your mix across the profiles shows how you
                naturally contribute to your team and clients.
              </p>
            </div>
          </div>
        </section>

        {/* Frequency summary */}
        <section className="rounded-2xl border bg-white p-6 md:p-7 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">Frequency summary</h2>
          <p className="text-sm text-slate-700">
            Your strongest overall frequency is{" "}
            <span className="font-semibold">{topFreqName}</span>, which shapes how you approach
            problems and make decisions. Higher percentages indicate where you naturally spend more
            energy; lower percentages highlight areas that may feel less comfortable or more
            draining.
          </p>
          <p className="text-sm text-slate-700">{dominantFreqSummary}</p>

          <div className="mt-4 grid gap-3">
            {result.frequency_labels.map((f) => (
              <div key={f.code} className="grid grid-cols-12 items-center gap-3">
                <div className="col-span-3 md:col-span-2 text-sm text-slate-800">
                  <span className="font-medium">{f.name}</span>
                </div>
                <div className="col-span-9 md:col-span-10">
                  <Bar pct={freqPct[f.code] || 0} />
                  <div className="mt-1 text-xs text-slate-500">
                    {Math.round((freqPct[f.code] || 0) * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Profile mix + overview */}
        <section className="rounded-2xl border bg-white p-6 md:p-7 space-y-6">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)]">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Profile mix</h2>
              <div className="grid gap-3">
                {result.profile_labels.map((p) => (
                  <div key={p.code} className="grid grid-cols-12 items-center gap-3">
                    <div className="col-span-6 md:col-span-4 text-sm text-slate-800">
                      <span className="font-medium">{p.name}</span>
                    </div>
                    <div className="col-span-6 md:col-span-8">
                      <Bar pct={profilePct[p.code] || 0} />
                      <div className="mt-1 text-xs text-slate-500">
                        {Math.round((profilePct[p.code] || 0) * 100)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t md:border-t-0 md:border-l border-slate-200 pt-6 md:pt-0 md:pl-6">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-[0.16em]">
                Top profile
              </h3>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {topProfileLabel || "Your strongest pattern"}
              </p>
              <p className="mt-3 text-sm text-slate-700">{topProfileSummary}</p>

              {(traits.length || motivators.length || blindSpots.length) && (
                <div className="mt-4 space-y-4 text-sm text-slate-700">
                  {traits.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">Key strengths</h4>
                      <ul className="mt-1 list-disc list-inside space-y-1">
                        {traits.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {motivators.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">Motivators</h4>
                      <ul className="mt-1 list-disc list-inside space-y-1">
                        {motivators.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {blindSpots.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">
                        Potential blind spots
                      </h4>
                      <ul className="mt-1 list-disc list-inside space-y-1">
                        {blindSpots.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Footer actions — Download button bottom-right */}
        <footer className="flex items-center justify-end pt-2 pb-6">
          <a
            href={portalReportDownloadUrl}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
          >
            Download PDF
          </a>
        </footer>
      </div>
    </div>
  );
}



