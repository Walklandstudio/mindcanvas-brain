import Link from "next/link";
import PersonalityMapSection from "./PersonalityMapSection";

import { getBaseUrl } from "@/lib/server-url";
import { getOrgFramework, type OrgFramework } from "@/lib/report/getOrgFramework";

export const dynamic = "force-dynamic";

type FrequencyCode = "A" | "B" | "C" | "D";

type FrequencyLabel = { code: FrequencyCode; name: string };
type ProfileLabel = { code: string; name: string };

type ResultData = {
  org_slug: string;
  org_name?: string | null;
  test_name: string;
  taker: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    // safety for older shapes
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

// ---------------------------------------------------------------------------
// Team Puzzle-specific helpers (images + mapping)
// ---------------------------------------------------------------------------

// Adjust these filenames if needed to match your actual files under /public/profile-cards
const TEAM_PUZZLE_ASSETS = {
  logo: "/profile-cards/tp-logo.png",
  chandell: "/profile-cards/tp-chandell.png",
  frequencies: "/profile-cards/tp-frequencies.png",
  mainGraphic: "/profile-cards/tp-main-graphic.png",
} as const;

// Map profile codes to the short keys used in your tp-*.png files
const PROFILE_CODE_TO_KEY: Record<string, string> = {
  P1: "visionary",
  P2: "catalyst",
  P3: "motivator",
  P4: "connector",
  P5: "facilitator",
  P6: "coordinator",
  P7: "controller",
  P8: "optimiser",
};

function getTeamPuzzleProfileImage(profileCode?: string | null) {
  if (!profileCode) return null;
  const normalised = profileCode.toUpperCase().replace(/^PROFILE_/, "P");
  const key = PROFILE_CODE_TO_KEY[normalised];
  if (!key) return null;

  const src = `/profile-cards/tp-${key}.png`;
  const alt = key.charAt(0).toUpperCase() + key.slice(1);
  return { src, alt };
}

// --- Generic helpers -------------------------------------------------------

function formatPercent(v: number | undefined): string {
  if (!v || Number.isNaN(v)) return "0%";
  return `${Math.round(v * 100)}%`;
}

function getFullName(taker: ResultData["taker"]): string {
  // Support both snake_case and camelCase just in case
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

// Generic fallbacks – work for *any* org
function getDefaultWelcome(orgName: string): { title: string; body: string[] } {
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
      "This report is a snapshot of how you naturally like to work, not a label. Use it as a guide, not a rule book.",
    bullets: [
      "Find simple words for how you like to work.",
      "Spot where your strengths add the most value to your team and organisation.",
      "Notice growth areas without labelling or limiting yourself.",
      "Have better conversations with leaders, colleagues, or a coach about how you work best.",
    ],
  };
}

function defaultHowToReadScores() {
  return {
    title: "How to read these scores",
    bullets: [
      "Higher percentages show patterns you use a lot.",
      "Lower percentages show styles you can use, but they may cost more energy.",
      "Anything above about 30% will usually feel very natural to you.",
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

// --- Page ------------------------------------------------------------------

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { tid?: string };
}) {
  const token = params.token;
  const tid = searchParams?.tid || "";

  if (!tid) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
        <div className="mx-auto max-w-4xl p-6">
          <h1 className="text-2xl font-semibold">Personalised report</h1>
          <p className="mt-4 text-sm text-slate-300">
            This page expects a <code>?tid=</code> parameter so we know which
            test taker&apos;s report to load.
          </p>
        </div>
      </div>
    );
  }

  const base = await getBaseUrl();

  // ---- Fetch result data (public API) ------------------------------------
  const resultUrl = `${base}/api/public/test/${encodeURIComponent(
    token
  )}/result?tid=${encodeURIComponent(tid)}`;

  let resultData: ResultData | null = null;
  let loadError: string | null = null;

  try {
    const res = await fetch(resultUrl, { cache: "no-store" });
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) {
      const text = await res.text();
      throw new Error(
        `Non-JSON response (${res.status}): ${text.slice(0, 300)}`
      );
    }
    const json = (await res.json()) as ResultAPI;
    if (!res.ok || json.ok === false || !json.data) {
      throw new Error(json.error || `HTTP ${res.status}`);
    }
    resultData = json.data;
  } catch (e: any) {
    loadError = String(e?.message || e);
  }

  if (!resultData || loadError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
        <div className="mx-auto max-w-4xl p-6 space-y-4">
          <h1 className="text-2xl font-semibold">Personalised report</h1>
          <p className="text-sm text-red-400">
            Could not load your report. Please refresh or contact support.
          </p>

          <details className="mt-4 rounded-lg border border-slate-700 bg-slate-950 p-4 text-xs text-slate-50">
            <summary className="cursor-pointer font-medium">
              Debug information (for developer)
            </summary>
            <div className="mt-2 space-y-2">
              <div>
                <div className="font-semibold">Result API</div>
                <div className="break-all">URL: {resultUrl}</div>
                <div>Error: {loadError ?? "Unknown"}</div>
              </div>
            </div>
          </details>
        </div>
      </div>
    );
  }

  const data = resultData;
  const orgSlug = data.org_slug;
  const isTeamPuzzle = orgSlug === "team-puzzle";

  const orgName = data.org_name || data.test_name || "Your Organisation";
  const participantName = getFullName(data.taker);

  // ---- Load org framework JSON (for copy) --------------------------------
  let orgFw: OrgFramework | null = null;
  try {
    orgFw = getOrgFramework(orgSlug);
  } catch {
    orgFw = null;
  }

  const fw = orgFw?.framework;
  const reportCopy: OrgReportCopy | null = fw?.report ?? null;

  // Base copies from JSON / defaults
  let reportTitle =
    reportCopy?.report_title || `${orgName} Profile Assessment`;

  let welcomeTitle: string =
    reportCopy?.welcome_title || getDefaultWelcome(orgName).title;

  let welcomeBody: string[] =
    reportCopy?.welcome_body && Array.isArray(reportCopy.welcome_body)
      ? reportCopy.welcome_body
      : getDefaultWelcome(orgName).body;

  let frameworkTitle: string =
    reportCopy?.framework_title || `The ${orgName} framework`;
  let frameworkIntro: string[] =
    reportCopy?.framework_intro && Array.isArray(reportCopy.framework_intro)
      ? reportCopy.framework_intro
      : getDefaultFrameworkIntro(orgName);

  let howToUse = reportCopy?.how_to_use || defaultHowToUse();
  let howToRead =
    reportCopy?.how_to_read_scores || defaultHowToReadScores();

  const profileCopy =
    (reportCopy?.profiles as OrgReportCopy["profiles"]) || {};

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

  const downloadPdfHref = `/api/portal/reports/${encodeURIComponent(
    data.taker.id
  )}`;

  const primaryExample =
    profileCopy?.[primary?.code || ""]?.example ||
    "For example, you’re likely to be the person who brings energy to the room, helps others stay engaged, and keeps people moving toward a shared goal.";

  // Personality map data (0–100) for chart
  const personalityMapResult = {
    frequencies: {
      innovationA: (freq.A ?? 0) * 100,
      influenceB: (freq.B ?? 0) * 100,
      implementationC: (freq.C ?? 0) * 100,
      insightD: (freq.D ?? 0) * 100,
    },
    profiles: {
      p1: data.profile_labels[0]
        ? (prof[data.profile_labels[0].code] ?? 0) * 100
        : 0,
      p2: data.profile_labels[1]
        ? (prof[data.profile_labels[1].code] ?? 0) * 100
        : 0,
      p3: data.profile_labels[2]
        ? (prof[data.profile_labels[2].code] ?? 0) * 100
        : 0,
      p4: data.profile_labels[3]
        ? (prof[data.profile_labels[3].code] ?? 0) * 100
        : 0,
      p5: data.profile_labels[4]
        ? (prof[data.profile_labels[4].code] ?? 0) * 100
        : 0,
      p6: data.profile_labels[5]
        ? (prof[data.profile_labels[5].code] ?? 0) * 100
        : 0,
      p7: data.profile_labels[6]
        ? (prof[data.profile_labels[6].code] ?? 0) * 100
        : 0,
      p8: data.profile_labels[7]
        ? (prof[data.profile_labels[7].code] ?? 0) * 100
        : 0,
    },
  };

  // -------------------------------------------------------------------------
  // Team Puzzle overrides (copy only)
  // -------------------------------------------------------------------------
  if (isTeamPuzzle) {
    reportTitle = "Team Puzzle Discovery Assessment";

    welcomeTitle = "Welcome to your Team Puzzle Discovery Report";
    welcomeBody = [
      "Welcome to your Team Puzzle Discovery Report. I’m excited to be part of your journey as you uncover your natural strengths, communication style and best-fit contribution at work.",
      "This report is designed to give you deep insight into how you work best, where you thrive in a team and how to align your role with your natural energy. When people understand themselves and each other more deeply, culture shifts, communication improves and performance becomes more sustainable.",
      "Team Puzzle was created with that in mind. It’s not just a tool for insight – it is a practical system for action. It maps the puzzle pieces of your team so that you can fit together more effectively, reduce friction and increase flow.",
      "Whether you are reading this as part of a leadership program, a coaching session or your own development, treat this as a starting point, not an ending. Use what you discover here to guide conversations, make better choices and design the way you want to work going forward.",
      "Warm regards,",
    ];

    howToUse = {
      summary:
        "This report is a snapshot of how you naturally like to work – it is a guide for reflection and conversation, not a label.",
      bullets: [
        "Highlight 2–3 sentences in this report that feel most true for you.",
        "Notice one strength you would like to lean into more deliberately.",
        "Notice one development area you would like to experiment with over the next month.",
        "Bring this report into your next one-to-one or coaching conversation and talk about where your role matches your strengths.",
        "Use this as a starting point, not a verdict. The most useful insights come from reflecting, asking questions, and applying what feels true in your day-to-day work.",
      ],
    };

    frameworkTitle = "The Team Puzzle framework";
    frameworkIntro = [
      "The Team Puzzle framework was created to help organisations get the best from each individual and even better results from the team as a whole.",
      "High-performing teams do not happen by accident. They are built with intention, structure and insight. This framework gives leaders and team members a clear, shared language for strengths, energy and contribution.",
      "When people are placed in roles that energise them, when teams communicate in a way that fits their natural style and when leaders understand how each person adds value, culture shifts. Engagement increases, trust grows and results improve.",
      "Rather than trying to ‘fix’ people, the Team Puzzle approach is about fitting people together. Just like a real puzzle, each person has a unique shape. This report helps you see how your piece fits so you can work with more clarity, confidence and impact.",
    ];

    howToRead = {
      title: "How to read these scores",
      bullets: [
        "Higher percentages highlight patterns you use frequently and with ease.",
        "Lower percentages highlight backup styles you can use when needed, but they may cost more energy.",
        "Anything above roughly 30% will usually feel very natural for you.",
        "Your primary profile is your strongest pattern. Your secondary and tertiary profiles show helpful support patterns around your core style.",
      ],
    };
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 pb-12 pt-8 md:px-6">
        {/* HEADER */}
        <header className="flex flex-col gap-6 border-b border-slate-800 pb-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium tracking-[0.2em] text-sky-300/80">
              PERSONALISED REPORT
            </p>

            <div className="flex items-center gap-3">
              {isTeamPuzzle && (
                <div className="h-10 w-10 overflow-hidden rounded-xl bg-white/5 border border-slate-700 flex items-center justify-center">
                  <img
                    src={TEAM_PUZZLE_ASSETS.logo}
                    alt="Team Puzzle"
                    className="h-8 w-8 object-contain"
                  />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-50">
                  {reportTitle}
                </h1>
                <p className="mt-1 text-sm text-slate-200">
                  For {participantName} · Top profile:{" "}
                  <span className="font-semibold">
                    {data.top_profile_name}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 md:flex-row md:items-center">
            {/* Top profile image (Team Puzzle only) */}
            {isTeamPuzzle && (
              <div className="w-[120px] h-[120px] rounded-3xl bg-sky-500/10 border border-sky-400/50 shadow-lg shadow-sky-900/60 overflow-hidden flex items-center justify-center">
                {primary && (
                  <img
                    src={
                      getTeamPuzzleProfileImage(primary.code)?.src ??
                      "/profile-cards/tp-motivator.png"
                    }
                    alt={
                      getTeamPuzzleProfileImage(primary.code)?.alt ??
                      data.top_profile_name
                    }
                    className="h-full w-full object-contain"
                  />
                )}
              </div>
            )}

            <Link
              href={downloadPdfHref}
              prefetch={false}
              className="inline-flex items-center rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm hover:bg-slate-800"
            >
              Download PDF
            </Link>
          </div>
        </header>

        {/* PART 1 ------------------------------------------------------------ */}
        <section className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
            Part 1 · About this assessment
          </p>

          {/* Welcome */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
            <h2 className="text-lg font-semibold">{welcomeTitle}</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              A note from the creator of this framework.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:items-start">
              <div className="space-y-3 text-sm leading-relaxed text-slate-700">
                {welcomeBody.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>

              {isTeamPuzzle && (
                <div className="mt-4 md:mt-0 flex flex-col items-center justify-center gap-3">
                  <div className="h-24 w-24 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                    <img
                      src={TEAM_PUZZLE_ASSETS.chandell}
                      alt="Chandell Labbozzetta"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="text-center text-xs text-slate-700">
                    <div className="font-semibold">
                      Chandell Labbozzetta
                    </div>
                    <div>Founder – Life Puzzle &amp; Team Puzzle Discovery Assessment</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* How to use + Framework (stacked) */}
          <div className="space-y-4">
            {/* How to use */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
              <h3 className="text-base font-semibold">How to use this report</h3>
              <p className="mt-2 text-sm text-slate-700">
                {howToUse.summary}
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {howToUse.bullets.map((b: string, i: number) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>

            {/* Org framework */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
              <h3 className="text-base font-semibold">{frameworkTitle}</h3>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
                {frameworkIntro.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>
            </div>
          </div>

          {/* Understanding Frequencies */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
            <h3 className="text-base font-semibold">
              Understanding the four Frequencies
            </h3>
            <p className="mt-2 text-sm text-slate-700">
              Frequencies describe the way you naturally think, decide, and
              take action. You can think of them as four types of work energy
              that show where you feel most at home.
            </p>

            {isTeamPuzzle && (
              <div className="mt-4 flex justify-center">
                <img
                  src={TEAM_PUZZLE_ASSETS.frequencies}
                  alt="Team Puzzle four Frequencies"
                  className="max-h-48 w-auto object-contain"
                />
              </div>
            )}

            <dl className="mt-4 space-y-2 text-sm text-slate-800">
              <div>
                <dt className="font-semibold">Innovation (A)</dt>
                <dd className="text-slate-700">
                  Ideas, creation, momentum, and challenging the status quo.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Influence (B)</dt>
                <dd className="text-slate-700">
                  People, communication, motivation, and activation.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Implementation (C)</dt>
                <dd className="text-slate-700">
                  Rhythm, process, and reliable delivery.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Insight (D)</dt>
                <dd className="text-slate-700">
                  Pattern recognition, analysis, and perspective.
                </dd>
              </div>
            </dl>
          </div>

          {/* Understanding Profiles */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
            <h3 className="text-base font-semibold">
              Understanding the eight Profiles
            </h3>
            <p className="mt-2 text-sm text-slate-700">
              Profiles blend these Frequencies into distinct patterns of
              contribution. A profile is simply a pattern that shows how you
              like to contribute in a team.
            </p>

            {isTeamPuzzle && (
              <div className="mt-4 flex justify-center">
                <img
                  src={TEAM_PUZZLE_ASSETS.mainGraphic}
                  alt="Team Puzzle profiles graphic"
                  className="max-h-56 w-auto object-contain"
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
                        "A distinct way of contributing, combining the four Frequencies into a recognisable working style."}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </section>

        {/* Personality map --------------------------------------------------- */}
        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Your personality map
          </p>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7">
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

        {/* PART 2 ------------------------------------------------------------ */}
        <section className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
            Part 2 · Your personal profile
          </p>

          {/* Frequency summary */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Frequency summary</h2>
                <p className="mt-1 text-sm text-slate-700">
                  Your strongest overall frequency is{" "}
                  <span className="font-semibold">
                    {
                      data.frequency_labels.find(
                        (f) => f.code === data.top_freq
                      )?.name
                    }
                    {" ("}
                    {data.top_freq}
                    {")"}
                  </span>
                  , which shapes how you approach problems and make decisions.
                  Higher percentages indicate where you naturally spend more
                  energy; lower percentages highlight areas that may feel less
                  comfortable or more draining.
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
                  <div
                    key={f.code}
                    className="grid grid-cols-12 items-center gap-3"
                  >
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
                      <div className="mt-1 text-xs text-slate-500">
                        {pct.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-xl bg-sky-50 p-4 text-sm text-sky-900">
              <p className="font-semibold">
                Your dominant frequency:{" "}
                {
                  data.frequency_labels.find(
                    (f) => f.code === data.top_freq
                  )?.name
                }{" "}
                ({data.top_freq})
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>
                  <span className="font-semibold">Key traits:</span> The energy
                  you rely on most when you need to move things forward.
                </li>
                <li>
                  <span className="font-semibold">Motivators:</span> Conditions
                  that help this way of working feel energising and sustainable.
                </li>
                <li>
                  <span className="font-semibold">Watch outs:</span> Things to
                  notice when this frequency is over-used, such as ignoring
                  other perspectives or pushing your preferred style too hard.
                </li>
              </ul>
            </div>
          </div>

          {/* Profile mix */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">Profile mix</h2>
              <p className="text-sm text-slate-700">
                Your profile mix shows how strongly you match each of the eight
                Profiles. Higher percentages show patterns you use often; lower
                ones are backup styles you can lean on when needed.
              </p>
            </div>

            <div className="mt-2 grid gap-3">
              {data.profile_labels.map((p) => {
                const val = prof[p.code] || 0;
                const pct = (val || 0) * 100;
                return (
                  <div
                    key={p.code}
                    className="grid grid-cols-12 items-center gap-3"
                  >
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
                      <div className="mt-1 text-xs text-slate-500">
                        {pct.toFixed(0)}% match
                      </div>
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

          {/* Primary / Secondary / Tertiary cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {[primary, secondary, tertiary].map((p, idx) => {
              if (!p) return null;
              const pct = (p.pct || 0) * 100;
              const label =
                idx === 0
                  ? "Primary profile"
                  : idx === 1
                  ? "Secondary"
                  : "Tertiary";
              const copy = profileCopy?.[p.code];

              const tpImage =
                isTeamPuzzle && getTeamPuzzleProfileImage(p.code);

              return (
                <div
                  key={p.code}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 text-slate-900"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {label}
                  </p>
                  {tpImage && (
                    <div className="mt-3 mb-3 flex justify-center">
                      <div className="h-24 w-24 rounded-2xl bg-sky-50 border border-slate-200 overflow-hidden flex items-center justify-center">
                        <img
                          src={tpImage.src}
                          alt={tpImage.alt}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    </div>
                  )}
                  <h3 className="text-lg font-semibold text-slate-900">
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-500">{p.code}</p>
                  <p className="mt-2 text-sm font-medium text-slate-800">
                    {pct.toFixed(0)}% match
                  </p>
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
            <h2 className="text-lg font-semibold">
              Energy mix – how your profiles work together
            </h2>
            <p className="mt-2 text-sm text-slate-700">
              Your top three profiles form an energy mix that shapes how you
              show up day to day. Your primary profile,{" "}
              <span className="font-semibold">{primary?.name}</span>, is the
              style you’re most likely to default to under pressure. Your
              secondary profile,{" "}
              <span className="font-semibold">{secondary?.name}</span>, adds a
              supporting pattern you can lean on. Your tertiary profile,{" "}
              <span className="font-semibold">{tertiary?.name}</span>, is a
              backup style you can draw on when needed.
            </p>
            <p className="mt-3 text-sm text-slate-700">{primaryExample}</p>
          </div>

          {/* Strengths + Development */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900">
              <h2 className="text-lg font-semibold">Strengths</h2>
              <p className="mt-2 text-sm text-slate-700">
                These are areas where your natural energy is most likely to add
                value when your work and environment are a good fit.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-slate-700">
                <li>
                  Leaning into your{" "}
                  <span className="font-semibold">{data.top_freq}</span> energy
                  when decisions need to be made or momentum is required.
                </li>
                <li>
                  Using your{" "}
                  <span className="font-semibold">{primary?.name}</span> profile
                  to bring something that others may not – whether that’s ideas,
                  people focus, structure, or depth.
                </li>
                <li>
                  Combining your top three profiles to adapt to different people
                  and contexts without losing your authenticity.
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900">
              <h2 className="text-lg font-semibold">
                Development areas
              </h2>
              <p className="mt-2 text-sm text-slate-700">
                Development areas are not weaknesses. They’re places where a
                small shift in awareness or behaviour can unlock more ease and
                impact.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-slate-700">
                <li>
                  Noticing when your dominant frequency is over-used and
                  crowding out other perspectives.
                </li>
                <li>
                  Experimenting with lower-percentage frequencies in low-risk
                  situations so they become more available when you need them.
                </li>
                <li>
                  Asking for support or partnership in areas that drain your
                  energy, rather than trying to do everything alone.
                </li>
              </ul>
            </div>
          </div>

          {/* Collaboration */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
            <h2 className="text-lg font-semibold">Collaboration</h2>
            <p className="mt-2 text-sm text-slate-700">
              Your profile doesn’t exist in isolation – it plays out in
              relationship with other people and profiles on your team.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-slate-700">
              <li>
                Look for partners whose strengths sit in lower-frequency areas
                for you. They can help you see risks and opportunities you might
                otherwise miss.
              </li>
              <li>
                Share this report with your manager or coach and talk about how
                your role can make the most of your natural energy.
              </li>
              <li>
                When conflict shows up, ask: “Is this about style rather than
                intent?” Often, different profiles are reaching for the same
                outcome in different ways.
              </li>
            </ul>
          </div>

          {/* Overall summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900">
            <h2 className="text-lg font-semibold">Overall summary</h2>
            <p className="mt-2 text-sm text-slate-700">
              In summary, your strongest contribution comes from your{" "}
              <span className="font-semibold">{primary?.name}</span> profile,
              supported by{" "}
              <span className="font-semibold">{secondary?.name}</span> and{" "}
              <span className="font-semibold">{tertiary?.name}</span>. Your{" "}
              <span className="font-semibold">
                {
                  data.frequency_labels.find(
                    (f) => f.code === data.top_freq
                  )?.name
                }{" "}
                ({data.top_freq})
              </span>{" "}
              frequency shapes how you naturally approach decisions, problems,
              and collaboration.
            </p>
            <p className="mt-3 text-sm text-slate-700">
              No profile is better than another. The aim is not to change who
              you are, but to understand how you work best, and how to create
              environments where you and your team can do your best thinking and
              contribution.
            </p>
          </div>

          {/* Next steps */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
            <h2 className="text-lg font-semibold">Next steps</h2>
            <p className="mt-2 text-sm text-slate-700">
              A profile report is most powerful when it turns into conversation
              and action. Use these suggestions to decide what you want to do
              with your insights:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-slate-700">
              <li>
                Highlight 2–3 sentences in this report that feel most true for
                you.
              </li>
              <li>
                Note one strength you want to lean into more deliberately over
                the next month.
              </li>
              <li>
                Note one development area you would like to experiment with.
              </li>
              <li>
                If you are a leader, bring this report into your 1-to-1s and
                discuss where your role matches your strengths.
              </li>
              <li>
                If you are working with a coach, choose one strength and one
                development area to explore in your next session.
              </li>
            </ul>
            <div className="mt-4">
              <Link
                href="#"
                className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700"
              >
                Continue
              </Link>
            </div>
          </div>
        </section>

        <footer className="mt-4 border-t border-slate-800 pt-4 text-xs text-slate-400">
          © {new Date().getFullYear()} MindCanvas — this report is generated
          based on the {orgName} profiling framework.
        </footer>
      </div>
    </div>
  );
}
