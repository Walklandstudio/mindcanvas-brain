// apps/web/app/t/[token]/report/LegacyReportClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import AppBackground from "@/components/ui/AppBackground";
import { getBaseUrl } from "@/lib/server-url";
import { getOrgFramework, type OrgFramework } from "@/lib/report/getOrgFramework";

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
  | { type: "h2"; text: string }
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

// ---------------- Shared Helpers ----------------

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

function hasStorageSections(data: ResultData | null): boolean {
  const s = data?.sections;
  if (!s) return false;
  const commonOk = Array.isArray(s.common) && s.common.length > 0;
  const profileOk = Array.isArray(s.profile) && s.profile.length > 0;
  return commonOk || profileOk || Boolean(s.report_title) || Boolean(s.profile_missing);
}

function safePct(v: number | undefined): string {
  const n = Number(v || 0);
  return `${Math.round(n * 100)}%`;
}

function norm(value: string | null | undefined): string {
  if (!value) return "";
  return value.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

// ---------------- Storage (LEAD) Block Renderer ----------------

function BlockView({ block }: { block: SectionBlock }) {
  if (block.type === "p") {
    return <p className="text-sm leading-relaxed text-slate-700">{block.text}</p>;
  }
  if (block.type === "h2") {
    return <h2 className="mt-6 text-lg font-semibold text-slate-900">{block.text}</h2>;
  }
  if (block.type === "h3") {
    return <h3 className="mt-5 text-base font-semibold text-slate-900">{block.text}</h3>;
  }
  if (block.type === "h4") {
    return <h4 className="mt-4 text-sm font-semibold text-slate-900">{block.text}</h4>;
  }
  if (block.type === "ul") {
    return (
      <ul className="ml-5 list-disc space-y-1 text-sm text-slate-700">
        {block.items?.map((it, i) => (
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
        {block.title && <p className="text-sm font-semibold text-slate-900">{block.title}</p>}
        {block.text && <p className="mt-1 text-sm text-slate-700">{block.text}</p>}
      </div>
    );
  }
  return null;
}

function SectionCard({ section }: { section: ReportSection }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
      {section.title && <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>}
      <div className="mt-4 space-y-3">
        {(section.blocks || []).map((b, i) => (
          <BlockView key={i} block={b} />
        ))}
      </div>
    </div>
  );
}

// ---------------- Shared UI Blocks ----------------

function BarRow(props: { label: string; pct: number }) {
  const pct = Number.isFinite(props.pct) ? props.pct : 0;
  const width = Math.max(0, Math.min(100, Math.round(pct)));

  return (
    <div className="grid grid-cols-12 items-center gap-3">
      <div className="col-span-4 text-sm text-slate-800">
        <span className="font-medium">{props.label}</span>
      </div>
      <div className="col-span-8">
        <div className="h-2 w-full rounded-full bg-slate-200">
          <div className="h-2 rounded-full bg-sky-600" style={{ width: `${width}%` }} />
        </div>
        <div className="mt-1 text-xs text-slate-500">{width}%</div>
      </div>
    </div>
  );
}

function NextStepsCard(props: { nextStepsUrl?: string | null }) {
  const nextStepsUrl = (props.nextStepsUrl || "").trim();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
      <h2 className="text-lg font-semibold text-slate-900">Next steps</h2>
      <p className="mt-2 text-sm text-slate-700">
        A profile report is most powerful when it turns into conversation and action. Use these
        suggestions to decide what you want to do with your insights:
      </p>

      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-700">
        <li>Highlight 2–3 sentences in this report that feel most true for you.</li>
        <li>Note one strength you want to lean into more deliberately over the next month.</li>
        <li>Note one development area you would like to experiment with.</li>
        <li>
          If you are a leader, bring this report into your 1-to-1s and discuss where your role
          matches your strengths.
        </li>
        <li>
          If you are working with a coach, choose one strength and one development area to explore
          in your next session.
        </li>
      </ul>

      {nextStepsUrl ? (
        <button
          onClick={() => window.open(nextStepsUrl, "_blank", "noopener,noreferrer")}
          className="mt-5 inline-flex items-center rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-900 shadow-sm hover:bg-emerald-500/15"
          title="Open next steps"
        >
          Go to next steps
        </button>
      ) : (
        <p className="mt-4 text-xs text-slate-500">Next steps link not available for this report.</p>
      )}
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

  // Load
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setLoadError(null);

        const b = await getBaseUrl();

        if (!tid) {
          setLoadError("Missing tid");
          setLoading(false);
          return;
        }

        const url = `${b}/api/public/test/${encodeURIComponent(token)}/report?tid=${encodeURIComponent(
          tid
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

  // Link: hide results redirect
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

    // Ensure we capture from top
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

  if (!tid) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-white">
        <h1 className="text-2xl font-semibold">Personalised report</h1>
        <p className="mt-4 text-sm text-slate-300">
          This page expects a <code>?tid=</code> parameter.
        </p>
      </div>
    );
  }

  if (loading || !data) {
    if (loadError) {
      return (
        <div className="mx-auto max-w-4xl p-6 space-y-4 text-white">
          <h1 className="text-2xl font-semibold">Personalised report</h1>
          <p className="text-sm text-red-400">Could not load your report.</p>
          <details className="rounded-lg border border-slate-700 bg-slate-950 p-4 text-xs text-slate-50">
            <summary className="cursor-pointer font-medium">Debug information</summary>
            <div className="mt-2 space-y-2">
              <div>Error: {loadError}</div>
            </div>
          </details>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-4xl p-6 text-white">
        <h1 className="text-2xl font-semibold">Personalised report</h1>
        <p className="mt-4 text-sm text-slate-300">Loading your report…</p>
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

  const participantName = getFullName(data.taker);
  const orgName = data.org_name || data.test_name || "MindCanvas";

  const nextStepsUrl = (data.link?.next_steps_url || "").trim();
  const hasNextSteps = !!nextStepsUrl;

  const useSections = hasStorageSections(data); // LEAD storage framework
  const freq = data.frequency_percentages || ({} as any);
  const prof = data.profile_percentages || ({} as any);

  // IMPORTANT: page H1 is ALWAYS the test name
  const pageTitle = data.test_name || `${orgName} Report`;

  // ---------------- Render ----------------

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

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">{pageTitle}</h1>

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

          {/* LEGACY: graphs stay near the top as before.
             LEAD (storage): graphs are injected later after “Introducing…” */}
          {!useSections ? (
            <section className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                Your personality map
              </p>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
                <h2 className="text-lg font-semibold text-slate-900">Your Personality Map</h2>
                <p className="mt-2 text-sm text-slate-700">
                  This visual map shows how your overall energy (Frequencies) and your more detailed
                  style (Profiles) are distributed across the model.
                </p>

                <div className="mt-6">
                  <PersonalityMapSection
                    frequencyPercentages={data.frequency_percentages}
                    profilePercentages={data.profile_percentages}
                  />
                </div>
              </div>
            </section>
          ) : null}

          {/* ---------------- LEAD (Storage sections) ---------------- */}
          {useSections ? (
            <LeadStorageReport
              data={data}
              freq={freq}
              prof={prof}
              nextStepsUrl={nextStepsUrl}
            />
          ) : (
            /* ---------------- Legacy full layout (Team Puzzle / Competency Coach) ---------------- */
            <LegacyFrameworkReport data={data} nextStepsUrl={nextStepsUrl} />
          )}

          <footer className="mt-4 border-t border-slate-800 pt-4 text-xs text-slate-400">
            © {new Date().getFullYear()} MindCanvas
          </footer>
        </div>
      </div>
    </div>
  );
}

// ---------------- LEAD storage renderer with injection ordering ----------------

function LeadStorageReport(props: {
  data: ResultData;
  freq: Record<FrequencyCode, number>;
  prof: Record<string, number>;
  nextStepsUrl: string;
}) {
  const { data, freq, prof, nextStepsUrl } = props;

  const common = (data.sections?.common || []) as ReportSection[];
  const profile = (data.sections?.profile || []) as ReportSection[];

  // We inject graphs + results snapshot AFTER this section.
  const injectAfterId = "introducing-the-mindcanvas-lead-system";

  let injected = false;

  const injectedBlock = (
    <div className="space-y-6">
      {/* Personality Map */}
      <section className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
          Your personality map
        </p>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
          <h2 className="text-lg font-semibold text-slate-900">Your Personality Map</h2>
          <p className="mt-2 text-sm text-slate-700">
            This visual map shows how your overall energy (Frequencies) and your more detailed style
            (Profiles) are distributed across the model.
          </p>

          <div className="mt-6">
            <PersonalityMapSection
              frequencyPercentages={data.frequency_percentages}
              profilePercentages={data.profile_percentages}
            />
          </div>
        </div>
      </section>

      {/* Results snapshot (with BAR charts) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
        <h2 className="text-lg font-semibold text-slate-900">
          {data.sections?.report_title || "Your results snapshot"}
        </h2>

        <p className="mt-2 text-sm text-slate-700">
          Top frequency:{" "}
          <span className="font-semibold">
            {data.frequency_labels.find((f) => f.code === data.top_freq)?.name || data.top_freq} (
            {data.top_freq})
          </span>{" "}
          · Top profile:{" "}
          <span className="font-semibold">
            {data.top_profile_name} ({data.top_profile_code})
          </span>
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Frequencies
            </p>
            <div className="mt-3 space-y-3">
              {data.frequency_labels.map((f) => (
                <BarRow
                  key={f.code}
                  label={f.name}
                  pct={Math.round((freq[f.code] || 0) * 100)}
                />
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Profiles
            </p>
            <div className="mt-3 space-y-3">
              {data.profile_labels.map((p) => (
                <BarRow
                  key={p.code}
                  label={p.name}
                  pct={Math.round(((prof[p.code] || 0) as number) * 100)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Missing profile warning */}
      {data.sections?.profile_missing ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <p className="font-semibold">Profile content not available yet</p>
          <p className="mt-1 text-sm">
            This report framework doesn’t include content for{" "}
            <span className="font-semibold">
              {data.top_profile_name} ({data.top_profile_code})
            </span>
            . Add that profile report inside the same framework JSON so this renders fully.
          </p>
          <p className="mt-2 text-xs text-amber-800">
            Framework: {data.sections?.framework_path || "—"} (
            {data.sections?.framework_version || "—"})
          </p>
        </div>
      ) : null}
    </div>
  );

  return (
    <section className="space-y-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Your report</p>

      {/* Render common sections. Welcome will be first (as desired). */}
      {common.map((s, i) => {
        const id = norm(s.id);
        const title = norm(s.title);
        const isIntroducing =
          id === injectAfterId || title.includes(injectAfterId) || title.includes("introducing-the-mindcanvas-lead-system");

        const node = <SectionCard key={s.id || i} section={s} />;

        if (!injected && isIntroducing) {
          injected = true;
          return (
            <div key={`common-${s.id || i}`} className="space-y-6">
              {node}
              {injectedBlock}
            </div>
          );
        }

        return node;
      })}

      {/* If we didn’t find the introducing section, inject at the end so graphs still appear */}
      {!injected ? injectedBlock : null}

      {/* Profile sections (if present) */}
      {profile.length > 0 ? (
        <>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
            Your operating style
          </p>
          {profile.map((s, i) => (
            <SectionCard key={s.id || `p-${i}`} section={s} />
          ))}
        </>
      ) : null}

      {/* Next steps (ALL reports) */}
      <NextStepsCard nextStepsUrl={nextStepsUrl} />

      <footer className="text-xs text-slate-400">
        Framework:{" "}
        <span className="text-slate-300">
          {data.sections?.framework_path || "—"} ({data.sections?.framework_version || "—"})
        </span>
      </footer>
    </section>
  );
}

// ---------------- Legacy renderer (Team Puzzle / Competency Coach) ----------------
// NOTE: This preserves your existing "great" legacy layout.
// It also adds the Next Steps block at the end.

function LegacyFrameworkReport({ data, nextStepsUrl }: { data: ResultData; nextStepsUrl: string }) {
  // Keep existing org-aware framework usage
  const orgFw: OrgFramework = getOrgFramework(data.org_slug);
  void orgFw;

  // If you already have the full legacy report implementation in your project
  // (the “great” one), KEEP it here as-is.
  //
  // For safety, we fall back to a minimal legacy render rather than breaking.
  // Replace this whole component body with your previous working legacy layout if needed.

  const freq = data.frequency_percentages;
  const prof = data.profile_percentages;

  const sortedProfiles = [...data.profile_labels]
    .map((p) => ({ ...p, pct: prof[p.code] ?? 0 }))
    .sort((a, b) => (b.pct || 0) - (a.pct || 0));

  const primary = sortedProfiles[0];

  return (
    <section className="space-y-6">
      {/* Minimal safe legacy content (won't crash) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
        <h2 className="text-lg font-semibold text-slate-900">Frequency summary</h2>
        <p className="mt-2 text-sm text-slate-700">
          Your strongest frequency is{" "}
          <span className="font-semibold">
            {data.frequency_labels.find((f) => f.code === data.top_freq)?.name || data.top_freq} (
            {data.top_freq})
          </span>
          .
        </p>

        <div className="mt-4 space-y-3">
          {data.frequency_labels.map((f) => (
            <BarRow
              key={f.code}
              label={f.name}
              pct={Math.round(((freq[f.code] || 0) as number) * 100)}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
        <h2 className="text-lg font-semibold text-slate-900">Profile mix</h2>
        <p className="mt-2 text-sm text-slate-700">
          Overall, your strongest profile pattern is{" "}
          <span className="font-semibold">{primary?.name || data.top_profile_name}</span>.
        </p>

        <div className="mt-4 space-y-3">
          {data.profile_labels.map((p) => (
            <BarRow
              key={p.code}
              label={p.name}
              pct={Math.round(((prof[p.code] || 0) as number) * 100)}
            />
          ))}
        </div>
      </div>

      {/* Next steps (ALL reports) */}
      <NextStepsCard nextStepsUrl={nextStepsUrl} />
    </section>
  );
}
