// apps/web/app/t/[token]/report/LegacyReportClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import AppBackground from "@/components/ui/AppBackground";
import { getBaseUrl } from "@/lib/server-url";
import PersonalityMapSection from "./PersonalityMapSection";

// ---------------- Types ----------------

type FrequencyCode = "A" | "B" | "C" | "D";

type FrequencyLabel = { code: FrequencyCode; name: string };
type ProfileLabel = { code: string; name: string };

type LinkMeta = {
  show_results?: boolean | null;
  redirect_url?: string | null;
  hidden_results_message?: string | null;
  next_steps_url?: string | null;
};

type SectionBlock =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "h4"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "divider" }
  | { type: "callout"; title?: string; text?: string };

type ReportSection = {
  id?: string;
  title?: string;
  blocks?: SectionBlock[];
};

type ReportSectionsPayload = {
  common?: ReportSection[] | null;
  profile?: ReportSection[] | null;
  report_title?: string | null;
  framework_version?: string | null;
  framework_bucket?: string | null;
  framework_path?: string | null;
  profile_missing?: boolean | null;
};

type ResultData = {
  org_slug: string;
  org_name?: string | null;
  test_name: string;

  link?: LinkMeta;

  taker: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };

  frequency_labels: FrequencyLabel[];
  frequency_percentages: Record<FrequencyCode, number>;
  frequency_totals?: Record<FrequencyCode, number>;

  profile_labels: ProfileLabel[];
  profile_percentages: Record<string, number>;
  profile_totals?: Record<string, number>;

  top_freq: FrequencyCode;
  top_profile_code: string;
  top_profile_name: string;

  sections?: ReportSectionsPayload | null;

  debug?: any;
  version?: string;
};

type ResultAPI = { ok: boolean; data?: ResultData; error?: string };

// ---------------- Helpers ----------------

function getFullName(taker: ResultData["taker"]): string {
  const rawFirst =
    (typeof taker.first_name === "string" && taker.first_name) ||
    (typeof taker.firstName === "string" && taker.firstName) ||
    "";
  const rawLast =
    (typeof taker.last_name === "string" && taker.last_name) ||
    (typeof taker.lastName === "string" && taker.lastName) ||
    "";

  const first = rawFirst.trim();
  const last = rawLast.trim();
  const full = `${first} ${last}`.trim();
  return full || "Participant";
}

function hasSections(data: ResultData | null): boolean {
  const s = data?.sections;
  if (!s) return false;
  const commonOk = Array.isArray(s.common) && s.common.length > 0;
  const profileOk = Array.isArray(s.profile) && s.profile.length > 0;
  return commonOk || profileOk;
}

function safePct(v: number | undefined): string {
  const n = Number(v || 0);
  return `${Math.round(n * 100)}%`;
}

// ---------------- Renderer for section blocks (LEAD storage) ----------------

function BlockView({ block }: { block: SectionBlock }) {
  if (block.type === "p") {
    return <p className="text-[15px] leading-7 text-slate-800 whitespace-pre-wrap">{block.text}</p>;
  }
  if (block.type === "h3") {
    return <h3 className="mt-5 text-base font-semibold text-slate-950">{block.text}</h3>;
  }
  if (block.type === "h4") {
    return <h4 className="mt-4 text-sm font-semibold text-slate-950">{block.text}</h4>;
  }
  if (block.type === "ul") {
    return (
      <ul className="ml-5 list-disc space-y-1 text-[15px] leading-7 text-slate-800">
        {(block.items || []).map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    );
  }
  if (block.type === "divider") {
    return <div className="my-5 h-px w-full bg-slate-200" />;
  }
  if (block.type === "callout") {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        {block.title && <p className="text-sm font-semibold text-slate-950">{block.title}</p>}
        {block.text && <p className="mt-1 text-[15px] leading-7 text-slate-800">{block.text}</p>}
      </div>
    );
  }
  return null;
}

function SectionCard({ section }: { section: ReportSection }) {
  const blocks = section.blocks || [];
  const isContents = (section.id || "").toLowerCase() === "contents";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
      {section.title && <h2 className="text-xl font-semibold text-slate-950">{section.title}</h2>}

      <div className="mt-4 space-y-3">
        {blocks.map((b, i) => {
          if (isContents && b.type === "ul") {
            return (
              <div key={i} className="columns-1 md:columns-2">
                <BlockView block={b} />
              </div>
            );
          }
          return <BlockView key={i} block={b} />;
        })}
      </div>
    </div>
  );
}

// ---------------- Main Component ----------------

export default function LegacyReportClient(props: { token: string; tid: string }) {
  const reportRef = useRef<HTMLDivElement | null>(null);
  const { token, tid } = props;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<ResultData | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  // Load report JSON
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setLoadError(null);

        const b = await getBaseUrl();
        if (cancelled) return;

        const url = `${b}/api/public/test/${encodeURIComponent(token)}/report?tid=${encodeURIComponent(
          tid,
        )}`;

        const res = await fetch(url, { cache: "no-store" });
        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
        }

        const json = (await res.json()) as ResultAPI;

        if (!res.ok || json.ok === false || !json.data) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }

        if (cancelled) return;
        setData(json.data);
        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        setLoadError(String(e?.message || e));
        setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token, tid]);

  // Link behaviour: hide results redirect
  useEffect(() => {
    if (!data) return;

    const showResults = data.link?.show_results ?? true;
    if (showResults) return;

    const redirectUrl = (data.link?.redirect_url || "").trim();
    if (!redirectUrl) return;

    setRedirecting(true);
    window.location.assign(redirectUrl);
  }, [data]);

  async function handleDownloadPdf() {
    if (!reportRef.current) return;

    const element = reportRef.current;
    const prevScroll = window.scrollY;
    window.scrollTo(0, 0);

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#050914",
        scrollY: -window.scrollY,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`mindcanvas-report-${token}.pdf`);
    } finally {
      window.scrollTo(0, prevScroll);
    }
  }

  // ---------------- States ----------------

  if (!tid) {
    return (
      <div className="min-h-screen bg-[#050914] text-white">
        <AppBackground />
        <main className="relative z-10 mx-auto max-w-4xl px-4 py-10 space-y-3">
          <h1 className="text-2xl font-semibold">Personalised report</h1>
          <p className="text-sm text-slate-300">
            This page expects a <code className="rounded bg-slate-900 px-1 py-0.5">?tid=</code>{" "}
            parameter.
          </p>
        </main>
      </div>
    );
  }

  if (loading || !data) {
    if (loadError) {
      return (
        <div className="min-h-screen bg-[#050914] text-white">
          <AppBackground />
          <main className="relative z-10 mx-auto max-w-4xl px-4 py-10 space-y-4">
            <h1 className="text-2xl font-semibold">Personalised report</h1>
            <p className="text-sm text-red-400">Could not load your report.</p>

            <details className="rounded-lg border border-slate-700 bg-slate-950 p-4 text-xs text-slate-50">
              <summary className="cursor-pointer font-medium">Debug information</summary>
              <div className="mt-2 space-y-2">
                <div>Error: {loadError}</div>
              </div>
            </details>
          </main>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#050914] text-white">
        <AppBackground />
        <main className="relative z-10 mx-auto max-w-4xl px-4 py-10">
          <h1 className="text-2xl font-semibold">Personalised report</h1>
          <p className="mt-4 text-sm text-slate-300">Loading your report…</p>
        </main>
      </div>
    );
  }

  // Hidden results interstitial
  const linkShowResults = data.link?.show_results ?? true;
  const linkRedirectUrl = (data.link?.redirect_url || "").trim();
  const linkHiddenMessage = (data.link?.hidden_results_message || "").trim();

  if (!linkShowResults) {
    if (redirecting && linkRedirectUrl) {
      return (
        <div className="min-h-screen bg-[#050914] text-white">
          <AppBackground />
          <main className="relative z-10 mx-auto max-w-3xl px-4 py-10 space-y-3">
            <h1 className="text-2xl font-semibold">Thanks — redirecting…</h1>
            <p className="text-sm text-slate-300">Taking you to the next step now.</p>
          </main>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#050914] text-white">
        <AppBackground />
        <main className="relative z-10 mx-auto max-w-3xl px-4 py-10 space-y-4">
          <h1 className="text-2xl font-semibold">Thank you</h1>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-200 whitespace-pre-wrap">
              {linkHiddenMessage ||
                "Thank you for completing this assessment. Your facilitator will share your insights with you next."}
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ---------------- Render ----------------

  const participantName = getFullName(data.taker);
  const nextStepsUrl = (data.link?.next_steps_url || "").trim();
  const hasNextSteps = !!nextStepsUrl;

  const freq = data.frequency_percentages || ({} as any);
  const prof = data.profile_percentages || ({} as any);

  const showStorageSections = hasSections(data);

  const reportTitle =
    (showStorageSections && data.sections?.report_title) || data.test_name || "MindCanvas Report";

  return (
    <div ref={reportRef} className="relative min-h-screen bg-[#050914] text-white overflow-hidden">
      <AppBackground />

      <div className="relative z-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 pb-12 pt-8 md:px-6">
          {/* HEADER */}
          <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-medium tracking-[0.2em] text-slate-300">
                PERSONALISED REPORT
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">{reportTitle}</h1>

              <p className="mt-2 text-sm text-slate-200">
                For {participantName} · Top profile:{" "}
                <span className="font-semibold">{data.top_profile_name}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {hasNextSteps && (
                <button
                  onClick={() => window.open(nextStepsUrl, "_blank", "noopener,noreferrer")}
                  className="inline-flex items-center rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 shadow-sm hover:bg-emerald-500/15"
                  title="Open next steps"
                >
                  Next steps
                </button>
              )}

              <button
                onClick={handleDownloadPdf}
                className="inline-flex items-center rounded-lg border border-slate-500 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm hover:bg-slate-800"
              >
                Download PDF
              </button>
            </div>
          </header>

          {/* ALWAYS: GRAPH SECTION */}
          <section className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              Your personality map
            </p>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
              <h2 className="text-xl font-semibold text-slate-950">Your Personality Map</h2>
              <p className="mt-2 text-[15px] leading-7 text-slate-800">
                This visual map shows how your overall energy (Frequencies) and your more detailed
                style (Profiles) are distributed across the model.
              </p>

              <div className="mt-6">
                <PersonalityMapSection
                  frequencyPercentages={data.frequency_percentages}
                  profilePercentages={data.profile_percentages}
                />
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Frequencies</p>
                  <div className="mt-2 space-y-2">
                    {data.frequency_labels.map((f) => (
                      <div key={f.code} className="flex items-center justify-between text-[15px]">
                        <span className="text-slate-900">{f.name}</span>
                        <span className="text-slate-600">{safePct(freq[f.code])}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-950">Profiles</p>
                  <div className="mt-2 space-y-2">
                    {data.profile_labels.map((p) => (
                      <div key={p.code} className="flex items-center justify-between text-[15px]">
                        <span className="text-slate-900">{p.name}</span>
                        <span className="text-slate-600">{safePct(prof[p.code])}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* STORAGE SECTIONS (LEAD) */}
          {showStorageSections ? (
            <section className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                Your report
              </p>

              {data.sections?.profile_missing ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
                  <p className="font-semibold">Profile content not available yet</p>
                  <p className="mt-1 text-sm">
                    This report framework doesn’t include content for{" "}
                    <span className="font-semibold">
                      {data.top_profile_name} ({data.top_profile_code})
                    </span>
                    .
                  </p>
                </div>
              ) : null}

              {(data.sections?.common || []).map((s, i) => (
                <SectionCard key={s.id || i} section={s} />
              ))}

              {(data.sections?.profile || []).map((s, i) => (
                <SectionCard key={s.id || `p-${i}`} section={s} />
              ))}

              <footer className="mt-2 text-xs text-slate-400">
                Framework:{" "}
                <span className="text-slate-300">
                  {data.sections?.framework_path || "—"} ({data.sections?.framework_version || "—"})
                </span>
              </footer>
            </section>
          ) : (
            /* LEGACY FALLBACK (safe) */
            <section className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                Summary
              </p>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
                <h2 className="text-xl font-semibold text-slate-950">Your top results</h2>
                <p className="mt-2 text-[15px] leading-7 text-slate-800">
                  Top profile:{" "}
                  <span className="font-semibold text-slate-950">{data.top_profile_name}</span> ·
                  Top frequency:{" "}
                  <span className="font-semibold text-slate-950">{data.top_freq}</span>
                </p>

                <div className="mt-4 grid gap-3">
                  {data.profile_labels.slice(0, 8).map((p) => (
                    <div key={p.code} className="flex items-center justify-between text-[15px]">
                      <span className="font-medium text-slate-900">{p.name}</span>
                      <span className="text-slate-600">{safePct(prof[p.code])}</span>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-xs text-slate-500">
                  Legacy narrative sections will be re-enabled via the API (server-side) so Team
                  Puzzle can render the “great” report again without importing frameworks in the
                  client.
                </p>
              </div>
            </section>
          )}

          <footer className="mt-4 border-t border-slate-800 pt-4 text-xs text-slate-400">
            © {new Date().getFullYear()} MindCanvas
          </footer>
        </div>
      </div>
    </div>
  );
}
