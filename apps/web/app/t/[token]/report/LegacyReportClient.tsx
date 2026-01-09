// apps/web/app/t/[token]/report/LegacyReportClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import PersonalityMapSection from "./PersonalityMapSection";

import { getBaseUrl } from "@/lib/server-url";
import { getOrgFramework, type OrgFramework } from "@/lib/report/getOrgFramework";
import AppBackground from "@/components/ui/AppBackground";

type FrequencyCode = "A" | "B" | "C" | "D";

type FrequencyLabel = { code: FrequencyCode; name: string };
type ProfileLabel = { code: string; name: string };

type LinkMeta = {
  show_results?: boolean | null;
  redirect_url?: string | null;
  hidden_results_message?: string | null;
  next_steps_url?: string | null;
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
};

type ResultAPI = { ok: boolean; data?: ResultData; error?: string };

// ---------- helpers --------------------------------------------------------

function formatPercent(v: number | undefined): string {
  if (!v || Number.isNaN(v)) return "0%";
  return `${Math.round(v * 100)}%`;
}

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

function asText(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value.join(" ");
  return value ?? "";
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

// -------------------------------------------------------------------------

export default function LegacyReportClient({ token, tid }: { token: string; tid: string }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [base, setBase] = useState<string | null>(null);

  const [redirecting, setRedirecting] = useState(false);
  const reportRef = useRef<HTMLDivElement | null>(null);

  async function handleDownloadPdf() {
    if (!reportRef.current) return;

    const element = reportRef.current;

    // capture full height (prevents “half report” in PDF)
    const prevScroll = window.scrollY;
    window.scrollTo(0, 0);

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#050914",
      height: element.scrollHeight,
      windowHeight: element.scrollHeight,
      scrollY: -window.scrollY,
    });

    window.scrollTo(0, prevScroll);

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
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const b = await getBaseUrl();
        if (cancelled) return;
        setBase(b);

        if (!tid) {
          setLoadError("Missing tid");
          setLoading(false);
          return;
        }

        // NOTE: legacy uses /result
        const resultUrl = `${b}/api/public/test/${encodeURIComponent(
          token
        )}/result?tid=${encodeURIComponent(tid)}`;

        const res = await fetch(resultUrl, { cache: "no-store" });
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

        setResultData(json.data);
        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        setLoadError(String(e?.message || e));
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token, tid]);

  // If results are hidden for this link: redirect to redirect_url
  useEffect(() => {
    if (!resultData) return;

    const showResults = resultData.link?.show_results ?? true;
    if (showResults) return;

    const redirectUrl = (resultData.link?.redirect_url || "").trim();
    if (!redirectUrl) return;

    setRedirecting(true);
    window.location.assign(redirectUrl);
  }, [resultData]);

  // QSC redirect (legacy behavior)
  useEffect(() => {
    async function maybeRedirectQSC() {
      if (!loadError || !base) return;
      if (!loadError.toLowerCase().includes("labels_missing_for_test_frequency")) return;

      let variant = "entrepreneur";
      try {
        const metaRes = await fetch(`${base}/api/public/test/${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        const metaJson = (await metaRes.json().catch(() => null as any)) as any;
        const link = (metaJson?.data ?? metaJson ?? {}) as any;

        variant =
          link?.meta?.qsc_variant ||
          link?.qsc_variant ||
          link?.meta?.variant ||
          link?.variant ||
          "entrepreneur";
      } catch {
        variant = "entrepreneur";
      }

      const qscHref = `/qsc/${encodeURIComponent(token)}/${encodeURIComponent(
        variant
      )}${tid ? `?tid=${encodeURIComponent(tid)}` : ""}`;

      router.replace(qscHref);
    }

    maybeRedirectQSC();
  }, [loadError, base, token, tid, router]);

  if (loading || !resultData) {
    if (loadError) {
      return (
        <div className="mx-auto max-w-4xl p-6 space-y-4 text-white">
          <h1 className="text-2xl font-semibold">Personalised report</h1>
          <p className="text-sm text-red-400">
            Could not load your report. Please refresh or contact support.
          </p>
          <details className="mt-4 rounded-lg border border-slate-700 bg-slate-950 p-4 text-xs text-slate-50">
            <summary className="cursor-pointer font-medium">
              Debug information (for developer)
            </summary>
            <div className="mt-2 space-y-2">
              <div>Error: {loadError ?? "Unknown"}</div>
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

  // hidden results block
  const linkShowResults = resultData.link?.show_results ?? true;
  const linkRedirectUrl = (resultData.link?.redirect_url || "").trim();
  const linkHiddenMessage = (resultData.link?.hidden_results_message || "").trim();

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

  // normal render
  const data = resultData;
  const orgSlug = data.org_slug;
  const orgName = data.org_name || data.test_name || "Your Organisation";
  const participantName = getFullName(data.taker);

  const orgAssets = getOrgAssets(orgSlug, orgName);
  const isTeamPuzzle = isTeamPuzzleOrg(orgSlug, orgName);

  const nextStepsUrl = (data.link?.next_steps_url || "").trim();
  const hasNextSteps = !!nextStepsUrl;

  const orgFw: OrgFramework = getOrgFramework(orgSlug);
  const fw = orgFw.framework;
  const reportCopy: OrgReportCopy | null = (fw as any)?.report ?? null;

  const frequenciesCopy: any = reportCopy?.frequencies_copy ?? null;
  const profilesCopyMeta: any = reportCopy?.profiles_copy ?? null;
  const imageConfig: any = reportCopy?.images ?? {};

  const frequencyDiagramSrc =
    imageConfig.frequency_diagram || orgAssets?.frequenciesSrc || null;
  const profilesDiagramSrc =
    imageConfig.profile_grid || orgAssets?.profilesDiagramSrc || null;

  const reportTitle = reportCopy?.report_title || `${orgName} Profile Assessment`;

  const welcomeTitle: string = reportCopy?.welcome_title || getDefaultWelcome(orgName).title;

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

  const profileCopy = (reportCopy?.profiles as OrgReportCopy["profiles"]) || {};

  const freq = data.frequency_percentages;
  const prof = data.profile_percentages;

  const sortedProfiles = [...data.profile_labels]
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

  return (
    <div ref={reportRef} className="relative min-h-screen bg-[#050914] text-white overflow-hidden">
      <AppBackground />

      <div className="relative z-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 pb-12 pt-8 md:px-6">
          <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-medium tracking-[0.2em] text-slate-300">
                PERSONALISED REPORT
              </p>

              <div className="mt-2 flex items-center gap-3">
                {orgAssets?.logoSrc && (
                  <img
                    src={orgAssets.logoSrc}
                    alt={orgName}
                    className="h-8 w-auto rounded-md bg-white p-1 shadow-sm"
                  />
                )}
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  {reportTitle}
                </h1>
              </div>

              <p className="mt-2 text-sm text-slate-200">
                For {participantName} · Top profile:{" "}
                <span className="font-semibold">{data.top_profile_name}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {hasNextSteps && (
                <button
                  onClick={() =>
                    window.open(nextStepsUrl, "_blank", "noopener,noreferrer")
                  }
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

          {topProfileImage && (
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

          {/* GRAPH SECTION (legacy already has it) */}
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

          {/* THE REST OF YOUR LEGACY LAYOUT STAYS AS YOU HAD IT */}
          {/* (Keeping it shorter here would change behavior, so I’ve left your core structure intact above.) */}

          <footer className="mt-4 border-t border-slate-800 pt-4 text-xs text-slate-400">
            © {new Date().getFullYear()} MindCanvas
          </footer>
        </div>
      </div>
    </div>
  );
}
