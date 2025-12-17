// apps/web/app/t/[token]/report/page.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
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

  // token link behaviour (added)
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

// ---------- client wrapper (because we call useSearchParams etc) -----------

export default function ReportPageWrapper({
  params,
}: {
  params: { token: string };
}) {
  const searchParams = useSearchParams();
  const tid = searchParams?.get("tid") ?? "";

  return <ReportPage params={params} tid={tid} />;
}

// ---------- actual page (logic) -------------------------------------------

function ReportPage({
  params,
  tid,
}: {
  params: { token: string };
  tid: string;
}) {
  const router = useRouter();
  const token = params.token;

  const [loading, setLoading] = useState(true);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [base, setBase] = useState<string | null>(null);

  const [redirecting, setRedirecting] = useState(false);
  const reportRef = useRef<HTMLDivElement | null>(null);

  async function handleDownloadPdf() {
    if (!reportRef.current) return;

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

        const resultUrl = `${b}/api/public/test/${encodeURIComponent(
          token
        )}/result?tid=${encodeURIComponent(tid)}`;

        const res = await fetch(resultUrl, { cache: "no-store" });
        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(
            `Non-JSON response (${res.status}): ${text.slice(0, 200)}`
          );
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

    // prevent render flash + prevent loops
    setRedirecting(true);

    // Full browser redirect (works across domains)
    window.location.assign(redirectUrl);
  }, [resultData]);

  // QSC redirect if needed – client-side using the error
  useEffect(() => {
    async function maybeRedirectQSC() {
      if (!loadError || !base) return;
      if (!loadError.toLowerCase().includes("labels_missing_for_test_frequency")) {
        return;
      }

      let variant = "entrepreneur";
      try {
        const metaRes = await fetch(
          `${base}/api/public/test/${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );
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

  if (!tid) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold text-white">Personalised report</h1>
        <p className="mt-4 text-sm text-slate-300">
          This page expects a <code>?tid=</code> parameter so we know which test
          taker’s report to load.
        </p>
      </div>
    );
  }

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

  // If results are hidden and we're redirecting, show a minimal interstitial
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
            <p className="text-sm text-slate-300">
              Taking you to the next step now.
            </p>
          </main>
        </div>
      );
    }

    // Safety fallback: if redirect_url missing, show hidden message (or default)
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

  const data = resultData;
  const orgSlug = data.org_slug;
  const orgName = data.org_name || data.test_name || "Your Organisation";
  const participantName = getFullName(data.taker);

  const orgAssets = getOrgAssets(orgSlug, orgName);
  const isTeamPuzzle = isTeamPuzzleOrg(orgSlug, orgName);

  // link next steps button
  const nextStepsUrl = (data.link?.next_steps_url || "").trim();
  const hasNextSteps = !!nextStepsUrl;

  // --- framework + copy (this is where we MUST rely on slug only) ----------
  const orgFw: OrgFramework = getOrgFramework(orgSlug);
  const fw = orgFw.framework;
  const reportCopy: OrgReportCopy | null = (fw as any)?.report ?? null;
  const frameworkKey = (fw as any)?.key ?? "unknown";

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
    .map((p) => ({
      ...p,
      pct: prof[p.code] ?? 0,
    }))
    .sort((a, b) => (b.pct || 0) - (a.pct || 0));

  const primary = sortedProfiles[0];
  const secondary = sortedProfiles[1];
  const tertiary = sortedProfiles[2];

  const primaryExample =
    profileCopy?.[primary?.code || ""]?.example ||
    "For example, you’re likely to be the person who brings energy to the room, helps others stay engaged, and keeps people moving toward a shared goal.";

  const topProfileImage =
    isTeamPuzzle && primary?.name ? getTeamPuzzleProfileImage(primary.name) : null;

  // ---------- RENDER -------------------------------------------------------

  return (
    <div
      ref={reportRef}
      className="relative min-h-screen bg-[#050914] text-white overflow-hidden"
    >
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

          {/* Optional top profile image for Team Puzzle */}
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

          {/* PART 1 ---------------------------------------------------------- */}
          <section className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              Part 1 · About this assessment
            </p>

            {/* Welcome */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
              <h2 className="text-lg font-semibold text-slate-900">{welcomeTitle}</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                A note from the creator of this framework.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] md:items-start">
                <div className="space-y-3 text-sm leading-relaxed text-slate-700">
                  {welcomeBody.map((p, idx) => (
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
            </div>

            {/* How to use + Framework */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
                <h3 className="text-base font-semibold text-slate-900">
                  How to use this report
                </h3>
                <p className="mt-2 text-sm text-slate-700">{howToUse.summary}</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {howToUse.bullets.map((b: string, i: number) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-slate-500">
                  Use this as a starting point, not a verdict. The most useful
                  insights come from reflecting, asking questions, and applying
                  what feels true in your day-to-day work.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
                <h3 className="text-base font-semibold text-slate-900">
                  {frameworkTitle}
                </h3>
                <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
                  {frameworkIntro.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>
              </div>
            </div>

            {/* Frequencies */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
              <h3 className="text-base font-semibold text-slate-900">
                {frequenciesCopy?.title || "Understanding the four Frequencies"}
              </h3>
              <p className="mt-2 text-sm text-slate-700">
                {frequenciesCopy?.intro || DEFAULT_FREQUENCIES_INTRO}
              </p>

              {frequencyDiagramSrc && (
                <div className="mt-4 flex justify-center">
                  <img
                    src={frequencyDiagramSrc}
                    alt="Frequencies"
                    className="max-h-64 w-auto rounded-xl"
                  />
                </div>
              )}

              <dl className="mt-4 space-y-2 text-sm text-slate-800">
                {data.frequency_labels.map((f) => {
                  const freqMeta = frequenciesCopy?.items?.[f.code as FrequencyCode] ?? null;
                  const name = freqMeta?.name || f.name;
                  const description =
                    freqMeta?.description ||
                    DEFAULT_FREQUENCY_DESCRIPTIONS[f.code as FrequencyCode];

                  return (
                    <div key={f.code}>
                      <dt className="font-semibold">
                        {name} ({f.code})
                      </dt>
                      <dd className="text-slate-700">{description}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>

            {/* Profiles overview */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
              <h3 className="text-base font-semibold text-slate-900">
                {profilesCopyMeta?.title || "Understanding the eight Profiles"}
              </h3>
              <p className="mt-2 text-sm text-slate-700">
                {profilesCopyMeta?.intro ||
                  "Profiles blend the Frequencies into distinct patterns of contribution. Your profile mix shows how you naturally create value in sessions, relationships and results."}
              </p>

              {profilesDiagramSrc && (
                <div className="mt-4 flex justify-center">
                  <img
                    src={profilesDiagramSrc}
                    alt="Profiles"
                    className="max-h-72 w-auto rounded-xl"
                  />
                </div>
              )}

              <dl className="mt-4 grid gap-2 text-sm text-slate-800 md:grid-cols-2">
                {data.profile_labels.map((p) => {
                  const copy = profileCopy?.[p.code];
                  return (
                    <div key={p.code}>
                      <dt className="font-semibold">{p.name}</dt>
                      <dd className="text-slate-700">
                        {copy?.one_liner ||
                          "A distinct coaching pattern that describes how you most naturally create value."}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </section>

          {/* Personality Map */}
          <section className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              Your personality map
            </p>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
              <h2 className="text-lg font-semibold text-slate-900">
                Your Personality Map
              </h2>
              <p className="mt-2 text-sm text-slate-700">
                This visual map shows how your overall energy (Frequencies) and
                your more detailed style (Profiles) are distributed across the
                model. Higher values show patterns you use more often.
              </p>
              <div className="mt-6">
                <PersonalityMapSection
                  frequencyPercentages={data.frequency_percentages}
                  profilePercentages={data.profile_percentages}
                />
              </div>
            </div>
          </section>

          {/* PART 2 – personal profile --------------------------------------- */}
          <section className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              Part 2 · Your personal profile
            </p>

            {/* Frequency summary */}
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Frequency summary
                  </h2>
                  <p className="mt-1 text-sm text-slate-700">
                    Your strongest overall frequency is{" "}
                    <span className="font-semibold">
                      {data.frequency_labels.find((f) => f.code === data.top_freq)?.name}
                      {" ("}
                      {data.top_freq}
                      {")"}
                    </span>
                    , which shapes how you approach problems and make decisions. Higher percentages indicate where you naturally
                    spend more energy; lower percentages highlight areas that may feel less comfortable or more draining.
                  </p>
                </div>
                <div className="rounded-xl bg-sky-50 px-4 py-3 text-xs text-sky-900">
                  <p className="font-semibold">{howToRead.title}</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {howToRead.bullets.map((b: string, i: number) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-2 grid gap-3">
                {data.frequency_labels.map((f) => {
                  const val = freq[f.code] || 0;
                  const pct = (val || 0) * 100;
                  return (
                    <div key={f.code} className="grid grid-cols-12 items-center gap-3">
                      <div className="col-span-3 md:col-span-2 text-sm text-slate-800">
                        <span className="font-medium">{f.name}</span>
                      </div>
                      <div className="col-span-9 md:col-span-10">
                        <div className="h-2 w-full rounded-full bg-slate-200">
                          <div
                            className="h-2 rounded-full bg-sky-600"
                            style={{ width: `${pct.toFixed(0)}%` }}
                          />
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{pct.toFixed(0)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-xl bg-sky-50 p-4 text-sm text-sky-900">
                <p className="font-semibold">
                  Your dominant frequency:{" "}
                  {data.frequency_labels.find((f) => f.code === data.top_freq)?.name} ({data.top_freq})
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>
                    <span className="font-semibold">Key traits:</span> The energy you rely on most when you need to move things forward.
                  </li>
                  <li>
                    <span className="font-semibold">Motivators:</span> Conditions that help this way of working feel energising and sustainable.
                  </li>
                  <li>
                    <span className="font-semibold">Watch outs:</span> Things to notice when this frequency is over-used, such as ignoring other perspectives or pushing your preferred style too hard.
                  </li>
                </ul>
              </div>
            </div>

            {/* Profile mix */}
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-slate-900">Profile mix</h2>
                <p className="text-sm text-slate-700">
                  Your profile mix shows how strongly you match each of the eight Profiles. Higher percentages show patterns you use often; lower ones are backup styles you can lean on when needed.
                </p>
              </div>

              <div className="mt-2 grid gap-3">
                {data.profile_labels.map((p) => {
                  const val = prof[p.code] || 0;
                  const pct = (val || 0) * 100;
                  return (
                    <div key={p.code} className="grid grid-cols-12 items-center gap-3">
                      <div className="col-span-3 md:col-span-2 text-sm text-slate-800">
                        <span className="font-medium">{p.name}</span>
                      </div>
                      <div className="col-span-9 md:col-span-10">
                        <div className="h-2 w-full rounded-full bg-slate-200">
                          <div
                            className="h-2 rounded-full bg-sky-600"
                            style={{ width: `${pct.toFixed(0)}%` }}
                          />
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{pct.toFixed(0)}% match</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-3 text-sm text-slate-700">
                Overall, your strongest profile pattern is{" "}
                <span className="font-semibold">
                  {primary?.name} ({primary?.code})
                </span>
                , supported by{" "}
                <span className="font-semibold">
                  {secondary?.name} ({secondary?.code})
                </span>{" "}
                and{" "}
                <span className="font-semibold">
                  {tertiary?.name} ({tertiary?.code})
                </span>
                .
              </p>
            </div>

            {/* Primary / secondary / tertiary cards */}
            <div className="grid gap-4 md:grid-cols-3">
              {[primary, secondary, tertiary].map((p, idx) => {
                if (!p) return null;
                const pct = (p.pct || 0) * 100;
                const label = idx === 0 ? "Primary profile" : idx === 1 ? "Secondary" : "Tertiary";
                const copy = profileCopy?.[p.code];

                const profileImg =
                  isTeamPuzzle && p.name ? getTeamPuzzleProfileImage(p.name) : null;

                return (
                  <div
                    key={p.code}
                    className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 text-slate-900"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {label}
                    </p>

                    {profileImg && (
                      <div className="mt-2 mb-3 flex justify-center">
                        <img
                          src={profileImg}
                          alt={p.name}
                          className="h-24 w-auto rounded-xl"
                        />
                      </div>
                    )}

                    <h3 className="text-lg font-semibold text-slate-900">{p.name}</h3>
                    <p className="text-xs text-slate-500">{p.code}</p>
                    <p className="mt-2 text-sm font-medium text-slate-800">{pct.toFixed(0)}% match</p>

                    <ul className="mt-3 flex-1 list-disc space-y-1 pl-4 text-xs text-slate-700">
                      <li>
                        <span className="font-semibold">Key traits:</span>{" "}
                        {asText(copy?.traits) ||
                          "How this profile most naturally contributes when things are going well."}
                      </li>
                      <li>
                        <span className="font-semibold">Motivators:</span>{" "}
                        {asText(copy?.motivators) ||
                          "Conditions that help this style feel energising and sustainable."}
                      </li>
                      <li>
                        <span className="font-semibold">Watch outs:</span>{" "}
                        {asText(copy?.blind_spots) ||
                          "Things to watch out for when this style is over-used or under pressure."}
                      </li>
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Energy mix */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
              <h2 className="text-lg font-semibold text-slate-900">
                Energy mix – how your profiles work together
              </h2>
              <p className="mt-2 text-sm text-slate-700">
                Your top three profiles form an energy mix that shapes how you show up day to day. Your primary profile,{" "}
                <span className="font-semibold">{primary?.name}</span>, is the style you’re most likely to default to under pressure. Your secondary profile,{" "}
                <span className="font-semibold">{secondary?.name}</span>, adds a supporting pattern you can lean on. Your tertiary profile,{" "}
                <span className="font-semibold">{tertiary?.name}</span>, is a backup style you can draw on when needed.
              </p>
              <p className="mt-3 text-sm text-slate-700">{primaryExample}</p>
            </div>

            {/* Strengths & Development */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900">
                <h2 className="text-lg font-semibold text-slate-900">Strengths</h2>
                <p className="mt-2 text-sm text-slate-700">
                  These are areas where your natural energy is most likely to add value when your work and environment are a good fit.
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-slate-700">
                  <li>
                    Leaning into your <span className="font-semibold">{data.top_freq}</span> energy when decisions need to be made or momentum is required.
                  </li>
                  <li>
                    Using your <span className="font-semibold">{primary?.name}</span> profile to bring something that others may not – whether that’s ideas, people focus, structure, or depth.
                  </li>
                  <li>
                    Combining your top three profiles to adapt to different people and contexts without losing your authenticity.
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900">
                <h2 className="text-lg font-semibold text-slate-900">Development areas</h2>
                <p className="mt-2 text-sm text-slate-700">
                  Development areas are not weaknesses. They’re places where a small shift in awareness or behaviour can unlock more ease and impact.
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-slate-700">
                  <li>
                    Noticing when your dominant frequency is over-used and crowding out other perspectives.
                  </li>
                  <li>
                    Experimenting with lower-percentage frequencies in low-risk situations so they become more available when you need them.
                  </li>
                  <li>
                    Asking for support or partnership in areas that drain your energy, rather than trying to do everything alone.
                  </li>
                </ul>
              </div>
            </div>

            {/* Collaboration */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
              <h2 className="text-lg font-semibold text-slate-900">Collaboration</h2>
              <p className="mt-2 text-sm text-slate-700">
                Your profile doesn’t exist in isolation – it plays out in relationship with other people and profiles on your team.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-slate-700">
                <li>
                  Look for partners whose strengths sit in lower-frequency areas for you. They can help you see risks and opportunities you might otherwise miss.
                </li>
                <li>
                  Share this report with your manager or coach and talk about how your role can make the most of your natural energy.
                </li>
                <li>
                  When conflict shows up, ask: “Is this about style rather than intent?” Often, different profiles are reaching for the same outcome in different ways.
                </li>
              </ul>
            </div>

            {/* Overall summary */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900">
              <h2 className="text-lg font-semibold text-slate-900">Overall summary</h2>
              <p className="mt-2 text-sm text-slate-700">
                In summary, your strongest contribution comes from your{" "}
                <span className="font-semibold">{primary?.name}</span> profile, supported by{" "}
                <span className="font-semibold">{secondary?.name}</span> and{" "}
                <span className="font-semibold">{tertiary?.name}</span>. Your{" "}
                <span className="font-semibold">
                  {data.frequency_labels.find((f) => f.code === data.top_freq)?.name} ({data.top_freq})
                </span>{" "}
                frequency shapes how you naturally approach decisions, problems, and collaboration.
              </p>
              <p className="mt-3 text-sm text-slate-700">
                No profile is better than another. The aim is not to change who you are, but to understand how you work best, and how to create environments where you and your team can do your best thinking and contribution.
              </p>
            </div>

            {/* Next steps (content stays, optional CTA button at the bottom too) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
              <h2 className="text-lg font-semibold text-slate-900">Next steps</h2>
              <p className="mt-2 text-sm text-slate-700">
                A profile report is most powerful when it turns into conversation and action. Use these suggestions to decide what you want to do with your insights:
              </p>

              <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-slate-700">
                <li>Highlight 2–3 sentences in this report that feel most true for you.</li>
                <li>Note one strength you want to lean into more deliberately over the next month.</li>
                <li>Note one development area you would like to experiment with.</li>
                <li>If you are a leader, bring this report into your 1-to-1s and discuss where your role matches your strengths.</li>
                <li>If you are working with a coach, choose one strength and one development area to explore in your next session.</li>
              </ul>

              {hasNextSteps && (
                <div className="mt-5">
                  <button
                    onClick={() => window.open(nextStepsUrl, "_blank", "noopener,noreferrer")}
                    className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Go to next steps
                  </button>
                </div>
              )}
            </div>
          </section>

          <footer className="mt-4 border-t border-slate-800 pt-4 text-xs text-slate-400">
            © {new Date().getFullYear()} MindCanvas
          </footer>
        </div>
      </div>
    </div>
  );
}



