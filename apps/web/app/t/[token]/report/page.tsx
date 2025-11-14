import Link from "next/link";
import { notFound } from "next/navigation";
import { getBaseUrl } from "@/lib/server-url";
import { getOrgFramework } from "@/lib/report/getOrgFramework";

type AB = "A" | "B" | "C" | "D";

type FrequencyLabel = { code: AB; name: string };
type ProfileLabel = { code: string; name: string };

type ReportData = {
  org_slug: string;
  test_name: string;
  taker: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
  };
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

type ResultAPIResponse =
  | { ok: true; data: ReportData }
  | { ok: false; error: string };

// Simple bar used for both frequency + profile mixes
function Bar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(1, Number(pct) || 0));
  const width = `${(clamped * 100).toFixed(0)}%`;

  return (
    <div className="w-full h-2 rounded bg-slate-200">
      <div className="h-2 rounded bg-sky-600" style={{ width }} />
    </div>
  );
}

function formatPercent(p: number) {
  return `${Math.round((p || 0) * 100)}%`;
}

/**
 * Organisation-specific welcome letters.
 * These can be moved into the JSON framework later; for now they’re
 * kept in code so you can get to a working report quickly.
 */
const WELCOME_LETTERS: Record<string, string> = {
  "team-puzzle": `
Welcome to your Team Puzzle Discovery Report. I’m so excited to be part of your journey as you uncover your natural strengths, communication style, and best-fit contribution in the workplace and getting the most out of yourself. This report is designed to give you deep insight into how you work best, where you thrive in a team, and how to align your role with your energy.

At Life Puzzle, I’ve worked with leaders, executives, and business owners for over two decades, helping them break through performance barriers, improve communication, and unlock their true potential. One consistent truth I’ve seen across every organisation? When people understand themselves and each other more deeply, the entire culture shifts, results improve, engagement increases, and people are genuinely more fulfilled.

Team Puzzle was created with that in mind. It’s not just a tool for insight, it’s a system for practical action. It maps the puzzle pieces of your team in a way that helps you fit together more effectively, reducing friction and increasing flow.

Whether you’re reading this report as part of a leadership team, a coaching session, or a personal development journey, I invite you to treat this insight not as an ending, but a starting point – a map for growth, alignment, and leadership that truly reflects your natural style.

Warm regards,
Chandell Labbozzetta
Founder, Life Puzzle & Team Puzzle Discovery Assessment
`.trim(),
  // Fallbacks for other orgs can be added here as you onboard them.
};

function getWelcomeLetter(orgSlug: string, orgName: string): string {
  if (WELCOME_LETTERS[orgSlug]) return WELCOME_LETTERS[orgSlug];

  return `
Welcome to your ${orgName} report.

This report is designed to give you language for your natural strengths, working style, and contribution at work. Use it as a starting point for reflection, coaching conversations, and better collaboration with your team.
`.trim();
}

type OrgFrameworkAny = any; // keep loose here so we don't fight TS while iterating

function getFrequencyDefinition(
  framework: OrgFrameworkAny,
  code: AB
): { name: string; description: string } | null {
  if (!framework) return null;

  const list: any[] =
    framework?.frequencies ??
    framework?.flows ??
    [];

  const match =
    list.find((f) => f.code === code) ||
    list.find((f) => f.key === code) ||
    null;

  if (!match) return null;
  return {
    name: match.name || match.label || match.code || code,
    description: match.description || match.summary || "",
  };
}

function getProfileSummary(
  framework: OrgFrameworkAny,
  code: string
): string {
  if (!framework) return "";
  const list: any[] = framework?.profiles ?? [];
  const match =
    list.find((p) => p.code === code) ||
    list.find((p) => p.key === code) ||
    null;
  return match?.summary || "";
}

// Very lightweight narrative – can be swapped later for richer AI text.
function getFrequencyBulletCopy(code: AB) {
  switch (code) {
    case "A":
      return {
        traits:
          "Idea-driven, future-focused, and energised by new possibilities.",
        motivators:
          "Space to experiment, innovate, and influence direction.",
        blindSpots:
          "May lose interest in detail, follow-through, or slower-paced environments.",
      };
    case "B":
      return {
        traits:
          "People-focused, expressive, and motivated by connection and momentum.",
        motivators:
          "Opportunities to communicate, collaborate, and bring others with you.",
        blindSpots:
          "May avoid conflict or overextend yourself to keep everyone on side.",
      };
    case "C":
      return {
        traits:
          "Practical, delivery-focused, and grounded in structure and action.",
        motivators:
          "Clear plans, responsibilities, and visible progress.",
        blindSpots:
          "May become impatient with ambiguity or slower decision making.",
      };
    case "D":
    default:
      return {
        traits:
          "Analytical, reflective, and focused on depth, insight, and patterns.",
        motivators:
          "Time to think, analyse, and improve systems or decisions.",
        blindSpots:
          "May overthink, delay action, or miss opportunities for quick wins.",
      };
  }
}

function roleLabel(index: number): string {
  if (index === 0) return "PRIMARY PROFILE";
  if (index === 1) return "SECONDARY";
  if (index === 2) return "TERTIARY";
  return "PROFILE";
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { tid?: string };
}) {
  const token = params.token;
  const tid = searchParams?.tid ?? "";

  if (!tid) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold">Personalised report</h1>
        <p className="mt-4 text-sm text-slate-600">
          This page expects a <code>?tid=</code> query parameter.
        </p>
      </div>
    );
  }

  const baseUrl = await getBaseUrl();

  const resultRes = await fetch(
    `${baseUrl}/api/public/test/${encodeURIComponent(
      token
    )}/result?tid=${encodeURIComponent(tid)}`,
    { cache: "no-store" }
  );

  if (!resultRes.ok) {
    const text = await resultRes.text();
    return (
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold">Personalised report</h1>
        <p className="mt-4 text-sm text-slate-700">
          Could not load your report. Please refresh or contact support.
        </p>
        <pre className="mt-4 rounded bg-slate-900 p-3 text-xs text-slate-50 whitespace-pre-wrap">
          Non-JSON response ({resultRes.status}):{"\n"}
          {text.slice(0, 600)}
        </pre>
      </div>
    );
  }

  const json = (await resultRes.json()) as ResultAPIResponse;
  if (!("ok" in json) || json.ok === false) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold">Personalised report</h1>
        <p className="mt-4 text-sm text-slate-700">
          Could not load your report. Please refresh or contact support.
        </p>
        <pre className="mt-4 rounded bg-slate-900 p-3 text-xs text-slate-50 whitespace-pre-wrap">
          {("error" in json && json.error) || "Unknown error"}
        </pre>
      </div>
    );
  }

  const data = json.data;
  if (!data) {
    notFound();
  }

  const orgSlug = data.org_slug;

  // FIXED: treat getOrgFramework as synchronous and guard against errors/null.
  let framework: OrgFrameworkAny = null;
  try {
    framework = getOrgFramework(orgSlug) as any;
  } catch {
    framework = null;
  }

  const orgName =
    (framework && (framework.name as string)) ||
    data.test_name ||
    "Your Organisation";

  const takerName = `${data.taker.first_name ?? ""} ${
    data.taker.last_name ?? ""
  }`.trim();

  const welcomeLetter = getWelcomeLetter(orgSlug, orgName);

  const freqPerc = data.frequency_percentages;
  const profPerc = data.profile_percentages;

  const frequencyLabels = data.frequency_labels;
  const profileLabels = data.profile_labels;

  // Map profile code → label
  const profileLabelMap = profileLabels.reduce<Record<string, ProfileLabel>>(
    (acc, p) => {
      acc[p.code] = p;
      return acc;
    },
    {}
  );

  // Top 3 profiles for the cards + energy matrix
  const sortedProfiles = Object.entries(profPerc)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
    .slice(0, 3)
    .map(([code, value]) => ({
      code,
      value,
      label: profileLabelMap[code]?.name || code,
      summary: getProfileSummary(framework, code),
    }));

  const topFreqDef = getFrequencyDefinition(framework, data.top_freq);
  const freqBullet = getFrequencyBulletCopy(data.top_freq);

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl flex-col gap-1 px-6 py-6">
          <p className="text-xs font-medium tracking-[0.2em] text-slate-500 uppercase">
            Personalised report
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            {orgName}
          </h1>
          <p className="text-sm text-slate-700">
            {takerName ? `For ${takerName}` : null}
            {takerName && data.top_profile_name ? " · " : ""}
            {data.top_profile_name ? (
              <>
                Top profile:{" "}
                <span className="font-semibold">
                  {data.top_profile_name}
                </span>
              </>
            ) : null}
          </p>
        </div>
      </header>

      <main className="mx-auto mt-6 flex max-w-4xl flex-col gap-8 px-6">
        {/* PART 1 — ABOUT THE TEST / FRAMEWORK */}
        <section aria-labelledby="about-system-heading">
          <h2
            id="about-system-heading"
            className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500"
          >
            Part 1 · About this assessment
          </h2>

          {/* Welcome letter */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">
              Welcome
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              A note from the creator of this framework.
            </p>
            <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
              {welcomeLetter}
            </div>
          </div>

          {/* How to use + framework explanation + frequencies/profiles */}
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,2fr)]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-base font-semibold text-slate-900">
                How to use this report
              </h3>
              <p className="mt-3 text-sm text-slate-700">
                This report combines your responses with {orgName}&apos;s
                profiling framework. It is designed to help you:
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                <li>Put clear language to your natural working style.</li>
                <li>
                  Spot where your strengths are most valuable to your team and
                  organisation.
                </li>
                <li>
                  Identify stretch and development areas without labelling or
                  limiting yourself.
                </li>
                <li>
                  Have better conversations with leaders, colleagues, or a
                  coach about how you work best.
                </li>
              </ul>
              <p className="mt-3 text-sm text-slate-700">
                Use this as a starting point, not a verdict. The most useful
                insights come from reflecting, asking questions, and applying
                what feels true in your day-to-day work.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-base font-semibold text-slate-900">
                The {orgName} framework
              </h3>
              <p className="mt-3 text-sm text-slate-700">
                The framework uses four core Frequencies to describe the energy
                you bring to your work, and eight Profiles which blend those
                frequencies into recognisable patterns of contribution.
              </p>

              <div className="mt-4 grid gap-4 text-sm text-slate-800 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold text-slate-900">
                    Frequencies (A–D)
                  </h4>
                  <p className="mt-1 text-sm text-slate-700">
                    Frequencies describe the way you naturally think, decide,
                    and take action:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    <li>
                      <span className="font-semibold">Innovation</span>: Ideas,
                      creation, and forward momentum.
                    </li>
                    <li>
                      <span className="font-semibold">Influence</span>:
                      Relationships, communication, and motivation.
                    </li>
                    <li>
                      <span className="font-semibold">Implementation</span>:
                      Rhythm, process, and reliable delivery.
                    </li>
                    <li>
                      <span className="font-semibold">Insight</span>: Pattern
                      recognition, analysis, and perspective.
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">
                    Profiles (P1–P8)
                  </h4>
                  <p className="mt-1 text-sm text-slate-700">
                    Profiles combine the Frequencies into distinct styles of
                    contribution. Your profile mix shows:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    <li>Where you naturally bring the most energy and value.</li>
                    <li>The kinds of work that feel easy or draining.</li>
                    <li>
                      How you prefer to communicate, decide, and collaborate.
                    </li>
                  </ul>
                  <p className="mt-3 text-sm text-slate-700">
                    In the next section you&apos;ll see your personal results
                    mapped across both Frequencies and Profiles.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PART 2 — PERSONAL PROFILE */}
        <section aria-labelledby="profile-section-heading" className="pt-4">
          <h2
            id="profile-section-heading"
            className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500"
          >
            Part 2 · Your profile in depth
          </h2>

          {/* Frequency summary + bullet copy */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900">
              Frequency summary
            </h3>
            <p className="mt-2 text-sm text-slate-700">
              Your strongest overall frequency is{" "}
              <span className="font-semibold">
                {topFreqDef?.name ?? data.top_freq}
              </span>
              , which shapes how you approach problems and make decisions.
              Higher percentages indicate where you naturally spend more energy;
              lower percentages highlight areas that may feel less comfortable
              or more draining.
            </p>

            <div className="mt-5 space-y-3">
              {frequencyLabels.map((f) => (
                <div
                  key={f.code}
                  className="grid grid-cols-12 items-center gap-3"
                >
                  <div className="col-span-3 md:col-span-2 text-sm text-slate-800">
                    <span className="font-medium">{f.name}</span>
                  </div>
                  <div className="col-span-9 md:col-span-10">
                    <Bar pct={freqPerc[f.code] || 0} />
                    <div className="mt-1 text-xs text-slate-500">
                      {formatPercent(freqPerc[f.code] || 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl bg-sky-50 px-4 py-3 text-sm text-slate-800">
              <p className="font-semibold">
                Your dominant frequency: {topFreqDef?.name ?? data.top_freq}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  <span className="font-semibold">Key traits:</span>{" "}
                  {freqBullet.traits}
                </li>
                <li>
                  <span className="font-semibold">Motivators:</span>{" "}
                  {freqBullet.motivators}
                </li>
                <li>
                  <span className="font-semibold">Blind spots:</span>{" "}
                  {freqBullet.blindSpots}
                </li>
              </ul>
            </div>
          </div>

          {/* Profile mix + summary */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900">
              Profile mix
            </h3>
            <p className="mt-2 text-sm text-slate-700">
              This chart shows how strongly you express each of the eight
              Profiles. The taller the bar, the more naturally that profile
              describes how you show up in your work.
            </p>

            <div className="mt-5 space-y-3">
              {profileLabels.map((p) => (
                <div
                  key={p.code}
                  className="grid grid-cols-12 items-center gap-3"
                >
                  <div className="col-span-4 md:col-span-3 text-sm text-slate-800">
                    <span className="font-medium">{p.name}</span>
                  </div>
                  <div className="col-span-8 md:col-span-9">
                    <Bar pct={profPerc[p.code] || 0} />
                    <div className="mt-1 text-xs text-slate-500">
                      {formatPercent(profPerc[p.code] || 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Primary / Secondary / Tertiary profile cards */}
          {sortedProfiles.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Your primary, secondary &amp; tertiary profiles
              </h3>
              <p className="text-sm text-slate-700">
                These three profiles represent the strongest patterns in your
                results. Together they form your unique{" "}
                <span className="font-semibold">energy mix</span>.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {sortedProfiles.map((p, idx) => (
                  <div
                    key={p.code}
                    className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="text-[10px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                      {roleLabel(idx)}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                      {p.label}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {p.code.replace("PROFILE_", "P")} ·{" "}
                      {formatPercent(p.value)}
                    </div>

                    {p.summary && (
                      <p className="mt-3 text-sm text-slate-700">
                        {p.summary}
                      </p>
                    )}

                    <div className="mt-3 space-y-1 text-sm text-slate-700">
                      <p>
                        <span className="font-semibold">Key traits:</span>{" "}
                        {p.summary ||
                          "Brings a recognisable pattern of strengths to the team."}
                      </p>
                      <p>
                        <span className="font-semibold">Motivators:</span>{" "}
                        Enjoys work that lets this profile&apos;s strengths be
                        seen, valued, and used regularly.
                      </p>
                      <p>
                        <span className="font-semibold">Blind spots:</span> When
                        overused, this style can crowd out other perspectives or
                        become less effective under stress.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Energy mix / strengths & development / examples */}
          {sortedProfiles.length > 0 && (
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,2fr)]">
              {/* Energy matrix */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-semibold text-slate-900">
                  Your energy mix
                </h3>
                <p className="mt-2 text-sm text-slate-700">
                  Your results suggest a blend of:
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {sortedProfiles.map((p, idx) => (
                    <li key={p.code}>
                      <span className="font-semibold">
                        {roleLabel(idx).toLowerCase().replace("profile", "").trim()}{" "}
                        – {p.label}:
                      </span>{" "}
                      {p.summary ||
                        "Brings a distinct style of contribution to your work and relationships."}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-slate-700">
                  Think of these profiles as &quot;neighbouring energies&quot;.
                  At your best, you can lean into each of them as needed –
                  shifting between driving ideas, building relationships,
                  implementing plans, or bringing insight to complex decisions.
                </p>
              </div>

              {/* Strengths & development */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-semibold text-slate-900">
                  Strengths &amp; development areas
                </h3>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      Strengths
                    </h4>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                      <li>
                        Clear strengths in{" "}
                        <span className="font-semibold">
                          {topFreqDef?.name ?? data.top_freq}
                        </span>{" "}
                        energy.
                      </li>
                      <li>
                        Strong match with{" "}
                        <span className="font-semibold">
                          {sortedProfiles[0].label}
                        </span>{" "}
                        profile, giving you a natural zone of contribution.
                      </li>
                      <li>
                        Ability to draw on your secondary and tertiary profiles
                        to adapt to different situations.
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      Development areas
                    </h4>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                      <li>
                        Pay attention to frequencies with lower percentages –
                        these may feel more draining or less intuitive.
                      </li>
                      <li>
                        Notice situations where your dominant style is not
                        landing well and experiment with small adjustments.
                      </li>
                      <li>
                        Use this report as a prompt for coaching conversations
                        about boundaries, focus, and sustainable performance.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Real-world examples */}
          {sortedProfiles.length > 0 && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-base font-semibold text-slate-900">
                Real-world examples
              </h3>
              <p className="mt-2 text-sm text-slate-700">
                Here are some ways your profile mix might show up in everyday
                work:
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                <li>
                  Projects where you can lean into{" "}
                  <span className="font-semibold">
                    {sortedProfiles[0].label}
                  </span>{" "}
                  often feel energising and natural.
                </li>
                <li>
                  You may be at your best when you can partner with people who
                  bring strengths in the frequencies or profiles that are lower
                  for you.
                </li>
                <li>
                  Team conversations are easier when you share this language –
                  it becomes simpler to talk about needs, stress, and ideal
                  ways of working without making it personal.
                </li>
              </ul>
              <p className="mt-3 text-sm text-slate-700">
                In coaching or team sessions, you can use this section as a
                starting point to map real scenarios from your role and identify
                specific strategies that match your energy.
              </p>
            </div>
          )}
        </section>

        {/* Footer actions */}
        <section className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} {orgName}. Report generated via your
            profiling platform.
          </div>
          <div>
            <a
              href={`/api/portal/reports/${encodeURIComponent(
                data.taker.id
              )}`}
              className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              Download PDF
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}

