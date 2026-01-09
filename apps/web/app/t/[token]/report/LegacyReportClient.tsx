// apps/web/app/t/[token]/report/LegacyReportClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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

  profile_labels: ProfileLabel[];
  profile_percentages: Record<string, number>;

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

function hasStorageSections(data: ResultData | null): boolean {
  const s = data?.sections;
  if (!s) return false;
  const commonOk = Array.isArray(s.common) && s.common.length > 0;
  const profileOk = Array.isArray(s.profile) && s.profile.length > 0;
  return commonOk || profileOk;
}

function asText(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value.join(" ");
  return value ?? "";
}

function normaliseOrg(value: string | null | undefined): string {
  if (!value) return "";
  return value.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function isTeamPuzzleOrg(orgSlug?: string | null, orgName?: string | null) {
  const slug = normaliseOrg(orgSlug);
  const name = normaliseOrg(orgName);
  const haystack = `${slug} ${name}`;
  return (
    haystack.includes("team-puzzle") ||
    haystack.includes("life-puzzle") ||
    (haystack.includes("team") && haystack.includes("puzzle"))
  );
}

function getOrgAssets(orgSlug?: string | null, orgName?: string | null) {
  if (!isTeamPuzzleOrg(orgSlug, orgName)) return null;

  return {
    logoSrc: "/org-graphics/tp-logo.png",
    frequenciesSrc: "/org-graphics/tp-4frequencies.png",
    profilesDiagramSrc: "/org-graphics/tp-main-graphic.png",
    founderPhotoSrc: "/org-graphics/tp-chandell.png",
    founderCaption:
      "Chandell Labbozzetta, Founder – Life Puzzle & Team Puzzle Discovery Assessment",
  };
}

function getTeamPuzzleProfileImage(profileName?: string): string | null {
  if (!profileName) return null;
  const key = profileName.trim().toLowerCase();

  const map: Record<string, string> = {
    visionary: "visionary",
    catalyst: "catalyst",
    motivator: "motivator",
    connector: "connector",
    facilitator: "facilitator",
    coordinator: "coordinator",
    controller: "controller",
    optimiser: "optimiser",
    optimizer: "optimiser",
  };

  const slug = map[key];
  if (!slug) return null;
  return `/profile-cards/tp-${slug}.png`;
}

function getDefaultWelcome(orgName: string) {
  return {
    title: "Welcome",
    body: [
      `Welcome to your ${orgName} report.`,
      "This report is designed to give you language for your natural strengths, working style, and contribution at work. Use it as a starting point for reflection, coaching conversations, and better collaboration with your team.",
    ],
  };
}

function getDefaultFrameworkIntro(orgName: string): string[] {
  return [
    `The ${orgName} framework uses four core Frequencies to describe the energy you bring to your work, and eight Profiles which blend those Frequencies into recognisable patterns of contribution.`,
    "Together, they give you a simple way to talk about how you like to think, decide, and collaborate — without putting you in a box.",
  ];
}

function defaultHowToUse() {
  return {
    summary:
      "This report is a snapshot of your natural patterns, not a fixed identity. Use it as a starting point for reflection, coaching and conversation.",
    bullets: [
      "Highlight 2–3 sentences that feel most true for you.",
      "Notice one strength you want to bring forward more deliberately.",
      "Identify one development area you would like to work on in the next month.",
      "Discuss this report with a coach, supervisor or trusted peer.",
    ],
  };
}

function defaultHowToReadScores() {
  return {
    title: "How to read these scores",
    bullets: [
      "Higher percentages highlight patterns you use frequently and with ease.",
      "Lower percentages highlight backup styles you can use when needed, but they may take more energy.",
      "Anything above roughly 30% will usually feel very natural for you.",
    ],
  };
}

type OrgReportCopy = OrgFramework["framework"]["report"] & {
  profiles?: Record<
    string,
    {
      one_liner?: string;
      traits?: string | string[];
      motivators?: string | string[];
      blind_spots?: string | string[];
      example?: string;
    }
  >;
};

const DEFAULT_FREQUENCIES_INTRO =
  "Frequencies describe the way you naturally think, decide and take action – your working energy.";

const DEFAULT_FREQUENCY_DESCRIPTIONS: Record<FrequencyCode, string> = {
  A: "Ideas, creation, momentum and challenging the status quo.",
  B: "People, communication, motivation and activation.",
  C: "Rhythm, process, structure and reliable delivery.",
  D: "Observation, reflection, analysis and deeper understanding.",
};

// ---------------- Renderer for section blocks (LEAD storage) ----------------

function BlockView({ block }: { block: SectionBlock }) {
  if (block.type === "p") {
    return <p className="text-sm leading-relaxed text-slate-700">{block.text}</p>;
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

// ---------------- Main Component ----------------

export default function LegacyReportClient(props: { token: string; tid: string }) {
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement | null>(null);

  const { token, tid } = props;

  const [base, setBase] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<ResultData | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  // Load report JSON (legacy + storage superset)
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setLoadError(null);

        const b = await getBaseUrl();
        if (cancelled) return;
        setBase(b);

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
    if (!reportRef.current || pdfBusy) return;

    setPdfBusy(true);
    try {
      try {
        // @ts-ignore
        if (document?.fonts?.ready) {
          // @ts-ignore
          await document.fonts.ready;
        }
      } catch {}

      const element = reportRef.current;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
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
    } catch (e) {
      console.error("PDF export failed:", e);
      alert("Sorry — the PDF export failed. Please try again.");
    } finally {
      setPdfBusy(false);
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
  const orgSlug = data.org_slug;
  const orgName = data.org_name || data.test_name || "MindCanvas";
  const hasNextSteps = !!(data.link?.next_steps_url || "").trim();
  const nextStepsUrl = (data.link?.next_steps_url || "").trim();

  const useSections = hasStorageSections(data);
  const prof = data.profile_percentages || ({} as any);

  // ✅ SAFE: don’t let unknown org slugs crash the entire report
  const orgFw = useMemo<OrgFramework | null>(() => {
    try {
      return getOrgFramework(orgSlug);
    } catch (e) {
      console.warn("getOrgFramework() fallback for org:", orgSlug, e);
      return null;
    }
  }, [orgSlug]);

  // --- legacy copy and imagery (only used when !useSections) ------
  const orgAssets = getOrgAssets(orgSlug, orgName);
  const isTeamPuzzle = isTeamPuzzleOrg(orgSlug, orgName);

  const fw = orgFw?.framework;
  const reportCopy: any = fw ? (fw as any)?.report : null;

  const frequenciesCopy: any = reportCopy?.frequencies_copy ?? null;
  const profilesCopyMeta: any = reportCopy?.profiles_copy ?? null;
  const imageConfig: any = reportCopy?.images ?? {};

  const frequencyDiagramSrc =
    imageConfig.frequency_diagram || orgAssets?.frequenciesSrc || null;
  const profilesDiagramSrc =
    imageConfig.profile_grid || orgAssets?.profilesDiagramSrc || null;

  const legacyReportTitle = reportCopy?.report_title || `${orgName} Profile Assessment`;

  const welcomeTitle: string =
    reportCopy?.welcome_title || getDefaultWelcome(orgName).title;

  const welcomeBody: string[] =
    reportCopy?.welcome_body && Array.isArray(reportCopy.welcome_body)
      ? reportCopy.welcome_body
      : getDefaultWelcome(orgName).body;

  const frameworkTitle: string = reportCopy?.framework_title || `The ${orgName} framework`;
  const frameworkIntro: string[] =
    reportCopy?.framework_intro && Array.isArray(reportCopy.framework_intro)
      ? reportCopy.framework_intro
      : getDefaultFrameworkIntro(orgName);

  const howToUse = reportCopy?.how_to_use || defaultHowToUse();
  const howToRead = reportCopy?.how_to_read_scores || defaultHowToReadScores();

  const profileCopy = (reportCopy?.profiles as any) || {};

  const sortedProfiles = [...(data.profile_labels || [])]
    .map((p) => ({ ...p, pct: prof[p.code] ?? 0 }))
    .sort((a, b) => (b.pct || 0) - (a.pct || 0));

  const primary = sortedProfiles[0];
  const secondary = sortedProfiles[1];
  const tertiary = sortedProfiles[2];

  const primaryExample =
    profileCopy?.[primary?.code || ""]?.example ||
    "For example, you’re likely to be the person who brings energy to the room, helps others stay engaged, and keeps people moving toward a shared goal.";

  const topProfileImage =
    isTeamPuzzle && primary?.name ? getTeamPuzzleProfileImage(primary.name) : null;

  const reportTitle =
    (useSections && data.sections?.report_title) || legacyReportTitle;

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

              <div className="mt-2 flex items-center gap-3">
                {orgAssets?.logoSrc && !useSections && (
                  <img
                    src={orgAssets.logoSrc}
                    alt={orgName}
                    className="h-8 w-auto rounded-md bg-white p-1 shadow-sm"
                  />
                )}
                <h1 className="text-3xl font-bold tracking-tight text-white">{reportTitle}</h1>
              </div>

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
                >
                  Next steps
                </button>
              )}

              <button
                onClick={handleDownloadPdf}
                disabled={pdfBusy}
                className="inline-flex items-center rounded-lg border border-slate-500 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm hover:bg-slate-800 disabled:opacity-60"
              >
                {pdfBusy ? "Preparing…" : "Download PDF"}
              </button>
            </div>
          </header>

          {/* Team Puzzle legacy profile image */}
          {!useSections && topProfileImage && (
            <div className="flex justify-center">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <img
                  src={topProfileImage}
                  alt={primary?.name || "Top profile"}
                  className="mx-auto h-40 w-auto rounded-xl"
                />
              </div>
            </div>
          )}

          {/* ALWAYS: GRAPH SECTION */}
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

          {/* STORAGE LEAD REPORT */}
          {useSections ? (
            <section className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                Your report
              </p>

              {data.sections?.profile_missing ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
                  <p className="font-semibold">Profile content not available yet</p>
                  <p className="mt-1 text-sm">
                    Your framework file does not include content for{" "}
                    <span className="font-semibold">
                      {data.top_profile_name} ({data.top_profile_code})
                    </span>
                    . Add a profile report for {data.top_profile_code} inside{" "}
                    <span className="font-mono">{data.sections.framework_path}</span>.
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
            // LEGACY FULL REPORT (requires orgFw; if null we still show something sensible)
            <section className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                Part 1 · About this assessment
              </p>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
                <h2 className="text-lg font-semibold text-slate-900">{welcomeTitle}</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  A note from the creator of this framework.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] md:items-start">
                  <div className="space-y-3 text-sm leading-relaxed text-slate-700">
                    {welcomeBody.map((p: string, idx: number) => (
                      <p key={idx}>{p}</p>
                    ))}
                  </div>

                  {orgAssets?.founderPhotoSrc && (
                    <div className="flex flex-col items-center gap-3 md:items-start">
                      <img
                        src={orgAssets.founderPhotoSrc}
                        alt={orgAssets.founderCaption || "Founder"}
                        className="h-28 w-28 rounded-full object-cover border border-slate-200"
                      />
                      {orgAssets.founderCaption && (
                        <p className="text-xs text-slate-500 text-center md:text-left">
                          {orgAssets.founderCaption}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {!orgFw && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                    <p className="font-semibold">Legacy framework not found for this org</p>
                    <p className="mt-1 text-sm">
                      This org slug isn’t mapped in <span className="font-mono">getOrgFramework.ts</span>,
                      so we’re showing a generic legacy layout.
                    </p>
                  </div>
                )}
              </div>

              {/* (You can keep/extend the rest of your full legacy layout here as needed.) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
                <h3 className="text-base font-semibold text-slate-900">Next steps</h3>
                <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-slate-700">
                  <li>Highlight 2–3 sentences that feel most true for you.</li>
                  <li>Choose one strength to bring forward more deliberately.</li>
                  <li>Choose one development edge to practice this month.</li>
                </ul>
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
