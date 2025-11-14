"use client";

import { useEffect, useState } from "react";
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
  top_profile_code: string;
  top_profile_name: string;
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

function safeGetOrgFramework(slug: string | null | undefined) {
  try {
    if (!slug) return null;
    return getOrgFramework(slug);
  } catch (e) {
    console.error("getOrgFramework error", e);
    return null;
  }
}

function extractFrameworkPieces(framework: any) {
  if (!framework) {
    return {
      introParagraphs: [] as string[],
      expectBullets: [] as string[],
      frequencies: [] as { code: string; name: string; summary?: string }[],
      profiles: [] as { code: string; name: string; summary?: string }[],
    };
  }

  const fw = (framework as any).framework ?? framework;

  const introParagraphs: string[] = [];
  if (fw.intro && typeof fw.intro === "string") introParagraphs.push(fw.intro);
  if (fw.overview && typeof fw.overview === "string") introParagraphs.push(fw.overview);

  const expectBullets: string[] = Array.isArray(fw.expect_bullets) ? fw.expect_bullets : [];

  const frequencies: { code: string; name: string; summary?: string }[] = [];
  const profiles: { code: string; name: string; summary?: string }[] = [];

  if (Array.isArray(fw.frequencies)) {
    for (const f of fw.frequencies) {
      frequencies.push({
        code: String(f.code ?? f.id ?? ""),
        name: String(f.name ?? f.label ?? f.code ?? ""),
        summary: f.summary ?? f.description,
      });
    }
  } else if (Array.isArray(fw.flows)) {
    for (const fl of fw.flows) {
      frequencies.push({
        code: String(fl.code ?? fl.id ?? ""),
        name: String(fl.name ?? fl.label ?? fl.code ?? ""),
        summary: fl.summary ?? fl.description,
      });
    }
  }

  if (Array.isArray(fw.profiles)) {
    for (const p of fw.profiles) {
      profiles.push({
        code: String(p.code ?? ""),
        name: String(p.name ?? p.label ?? ""),
        summary: p.summary ?? p.description,
      });
    }
  }

  return { introParagraphs, expectBullets, frequencies, profiles };
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

  const { result, portal } = state;

  const orgSlug = (portal.org?.slug || result.org_slug || "").toLowerCase();
  const orgName = portal.org?.name || result.org_slug || "Your organisation";

  const framework = safeGetOrgFramework(orgSlug);
  const { introParagraphs, expectBullets, frequencies, profiles } =
    extractFrameworkPieces(framework);

  const freqLabelsByCode: Record<string, string> = {};
  for (const f of result.frequency_labels) {
    freqLabelsByCode[f.code] = f.name;
  }

  const topFreqCode = result.top_freq;
  const topFreqName = freqLabelsByCode[topFreqCode] ?? topFreqCode;
  const freqPct = result.frequency_percentages;

  const profilePct = result.profile_percentages;

  const topProfileCode = result.top_profile_code;
  const topProfileLabel =
    result.profile_labels.find((p) => p.code === topProfileCode)?.name ||
    result.top_profile_name;

  const profileNumericCode = topProfileCode?.startsWith("PROFILE_")
    ? topProfileCode.replace("PROFILE_", "")
    : topProfileCode;

  const profileDef =
    profiles.find((p) => p.code === profileNumericCode) ||
    profiles.find((p) => p.name === topProfileLabel) ||
    null;

  // Pull richer detail fields if they exist in the JSON (supports both wrapped + unwrapped)
  const allProfiles: any[] =
    (framework as any)?.profiles ??
    ((framework as any)?.framework?.profiles ?? []);

  const rawProfile =
    allProfiles.find(
      (p: any) =>
        p.code === profileNumericCode ||
        p.name === topProfileLabel ||
        p.label === topProfileLabel
    ) ?? {};

  const traits: string[] = rawProfile.traits || rawProfile.strengths || [];
  const motivators: string[] = rawProfile.motivators || rawProfile.drivers || [];
  const blindSpots: string[] = rawProfile.blind_spots || rawProfile.risks || [];

  const dominantFreqDefinition =
    frequencies.find((f) => f.code === topFreqCode || f.name === topFreqName) ?? null;

  const dominantFreqSummary =
    (dominantFreqDefinition && dominantFreqDefinition.summary) ||
    `Your strongest overall frequency is ${topFreqName}, which represents the way you most naturally approach your work and decision-making.`;

  const topProfileSummary =
    (profileDef && profileDef.summary) ||
    `This profile describes how you prefer to contribute, collaborate, and create momentum in your work.`;

  const takerName = `${portal.taker?.first_name ?? ""} ${
    portal.taker?.last_name ?? ""
  }`.trim();

  const portalReportDownloadUrl = `/api/portal/reports/${encodeURIComponent(tid)}`;
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 md:py-10 space-y-6 md:space-y-8">
        {/* HEADER */}
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Personalised report
          </p>
          <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-3">
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

        {/* PART 1 — ABOUT THE TEST / ORG */}

        <section className="rounded-2xl border bg-white p-6 md:p-7 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">About this profiling system</h2>

          {introParagraphs.length > 0 ? (
            introParagraphs.map((para, idx) => (
              <p key={idx} className="text-sm leading-relaxed text-slate-700">
                {para}
              </p>
            ))
          ) : (
            <>
              <p className="text-sm leading-relaxed text-slate-700">
                This report is based on{" "}
                <span className="font-medium">{orgName}</span>&apos;s profiling framework. It is
                designed to give you language for your natural working style, the patterns you lean
                on most often, and the areas that may require more conscious effort.
              </p>
              <p className="text-sm leading-relaxed text-slate-700">
                You can use these insights to reflect on how you make decisions, how you
                collaborate with others, and which environments bring out your best work. It is not
                a verdict on who you are, but a starting point for conversations about strengths,
                stretch areas, and growth.
              </p>
            </>
          )}

          <div className="grid gap-6 md:grid-cols-2 text-sm">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Frequencies</h3>
              <p className="text-slate-700">
                The framework uses core Frequencies to describe the energy you bring to your work.
                Each frequency highlights a different way of thinking, deciding, and adding value.
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
                The Profiles combine these Frequencies into distinct patterns of strengths,
                motivations, and potential blind spots. Your profile mix shows how you naturally
                contribute to your team, clients, and projects.
              </p>
              {expectBullets.length > 0 && (
                <>
                  <p className="mt-3 text-slate-700 font-semibold">In this report you will:</p>
                  <ul className="mt-1 space-y-1 list-disc list-inside text-slate-700">
                    {expectBullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </section>

        {profiles.length > 0 && (
          <section className="rounded-2xl border bg-white p-6 md:p-7 space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">
              The profiles in this framework
            </h2>
            <p className="text-sm text-slate-700">
              Each profile blends the Frequencies into a different working style. Together they
              give a shared language for how people think, decide, and collaborate.
            </p>
            <div className="grid gap-4 md:grid-cols-2 text-sm">
              {profiles.map((p) => (
                <div key={p.code} className="border border-slate-200 rounded-xl p-3">
                  <div className="font-semibold text-slate-900">{p.name}</div>
                  {p.summary && (
                    <p className="mt-1 text-slate-700 leading-snug">{p.summary}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PART 2 — PERSONAL PROFILE */}

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

        <section className="rounded-2xl border bg-white p-6 md:p-7 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            Strengths and development areas
          </h2>
          <p className="text-sm text-slate-700">
            The combination of your frequencies and top profile highlights both the strengths you
            can lean on and the areas that may benefit from more conscious focus.
          </p>

          <div className="grid gap-6 md:grid-cols-2 text-sm">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Where you add the most value</h3>
              <ul className="space-y-1 list-disc list-inside text-slate-700">
                <li>
                  You show your strongest energy through{" "}
                  <span className="font-medium">{topFreqName}</span>, which is the pattern others
                  are most likely to experience.
                </li>
                <li>
                  Your <span className="font-medium">{topProfileLabel}</span> profile gives you a
                  natural way of building momentum and contributing to outcomes.
                </li>
                {traits.slice(0, 3).map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Stretch and watch-outs</h3>
              <ul className="space-y-1 list-disc list-inside text-slate-700">
                <li>
                  Lower-scoring frequencies may feel less instinctive; they are often where more
                  preparation or collaboration is helpful.
                </li>
                {blindSpots.slice(0, 3).map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
                {blindSpots.length === 0 && (
                  <li>
                    Pay attention to situations where your strengths are overused – the same
                    patterns that help you succeed can become limiting when pushed too far.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 md:p-7 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">Next steps</h2>
          <p className="text-sm text-slate-700">
            This report is most powerful when it becomes part of an ongoing conversation. Use it as
            a reference point in coaching sessions, one-to-ones, and team discussions.
          </p>
          <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
            <li>Highlight the sections that resonate most strongly with your day-to-day work.</li>
            <li>
              Choose one strength you want to lean into more deliberately over the next month.
            </li>
            <li>
              Choose one stretch area where you will ask for support, feedback, or a different way
              of working.
            </li>
            <li>
              Share your top profile and frequency mix with your manager, coach, or team and discuss
              how to make the most of it.
            </li>
          </ul>
        </section>

        <footer className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-2 pb-6 text-sm text-slate-500">
          <div>© {currentYear} {orgName}</div>
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

