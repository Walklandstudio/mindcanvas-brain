"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type AB = "A" | "B" | "C" | "D";

type FrequencyLabel = { code: AB; name: string };
type ProfileLabel = { code: string; name: string };

type ResultData = {
  org_slug?: string;
  test_name?: string;
  taker?: { id: string };
  frequency_labels: FrequencyLabel[];
  frequency_percentages: Record<AB, number>;
  profile_labels: ProfileLabel[];
  profile_percentages: Record<string, number>;
  top_freq: AB;
  top_profile_code: string;
  top_profile_name: string;
};

type PortalReportData = {
  title?: string;
  org?: { slug?: string; name?: string };
  taker?: { first_name?: string | null; last_name?: string | null };
  top_profile_name?: string;
};

type ResultAPI = { ok: boolean; data: ResultData; error?: string };
type PortalAPI = { ok: boolean; data: PortalReportData; error?: string };

type Combined = {
  result: ResultData;
  portal: PortalReportData;
};

function Bar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(1, Number(pct) || 0));
  const width = `${(clamped * 100).toFixed(0)}%`;
  return (
    <div className="w-full h-2 rounded bg-slate-200/80">
      <div className="h-2 rounded bg-sky-600" style={{ width }} />
    </div>
  );
}

export default function ReportPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const searchParams = useSearchParams();
  const tid = searchParams?.get("tid") ?? "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<Combined | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!tid) {
        setErr("Missing taker ID (?tid=)");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErr(null);

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

        const resultText = await resultRes.text();
        const portalText = await portalRes.text();

        const debugLines = [
          "Result API",
          `URL: ${resultUrl}`,
          `Status: ${resultRes.status}`,
          "",
          "Portal report API",
          `URL: ${portalUrl}`,
          `Status: ${portalRes.status}`,
        ].join("\n");

        if (!cancelled) {
          setDebugInfo(debugLines);
        }

        if (!resultRes.ok || !portalRes.ok) {
          // Try to read JSON error if present
          let message = "Failed to load report data.";
          try {
            const maybeJson: any = JSON.parse(
              !resultRes.ok ? resultText : portalText
            );
            if (maybeJson?.error) message = String(maybeJson.error);
          } catch {
            // ignore JSON parse errors, keep generic message
          }
          throw new Error(message);
        }

        const resultJson = JSON.parse(resultText) as ResultAPI;
        const portalJson = JSON.parse(portalText) as PortalAPI;

        if (!resultJson.ok || !portalJson.ok) {
          throw new Error(
            resultJson.error ||
              portalJson.error ||
              "Unexpected response from API."
          );
        }

        if (!cancelled) {
          setData({
            result: resultJson.data,
            portal: portalJson.data,
          });
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(String(e?.message || e));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, tid]);

  const freqPercentages = useMemo(
    () =>
      data?.result?.frequency_percentages ?? {
        A: 0,
        B: 0,
        C: 0,
        D: 0,
      },
    [data]
  );

  const sortedProfiles = useMemo(() => {
    if (!data?.result) return [];
    const { profile_labels, profile_percentages } = data.result;
    return profile_labels
      .map((p) => ({
        code: p.code,
        name: p.name,
        pct: (profile_percentages || {})[p.code] || 0,
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [data]);

  if (!tid) {
    return (
      <div className="min-h-screen p-6 md:p-10">
        <h1 className="text-2xl font-semibold">Missing taker ID</h1>
        <p className="mt-2 text-slate-600">
          This page expects a <code>?tid=</code> query parameter.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 md:p-10">
        <h1 className="text-2xl font-semibold">Loading report…</h1>
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="min-h-screen p-6 md:p-10">
        <h1 className="text-2xl font-semibold">Personalised report</h1>
        <p className="mt-3 text-slate-700">
          Could not load your report. Please refresh or contact support.
        </p>
        <div className="mt-4 rounded-lg bg-slate-900 text-slate-100 p-4 text-xs whitespace-pre-wrap">
          {`Debug information (for developer):\n\n${err || "Unknown error."}\n\n${
            debugInfo || ""
          }`}
        </div>
      </div>
    );
  }

  const { result, portal } = data;

  const orgName =
    portal.org?.name ||
    result.org_slug ||
    portal.title ||
    "Your Organisation";

  const takerName = [
    portal.taker?.first_name || "",
    portal.taker?.last_name || "",
  ]
    .filter(Boolean)
    .join(" ");

  const topProfileName =
    result.top_profile_name || portal.top_profile_name || "—";

  const topFreqCode = result.top_freq;
  const topFreqLabel =
    result.frequency_labels.find((f) => f.code === topFreqCode)?.name ||
    topFreqCode;

  const primary = sortedProfiles[0];
  const secondary = sortedProfiles[1];
  const tertiary = sortedProfiles[2];

  const profilePct = (code: string) =>
    (result.profile_percentages || {})[code] || 0;

  const currentYear = new Date().getFullYear();

  const handleDownloadPdf = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="mx-auto max-w-5xl px-4 pt-8 md:px-6">
        {/* Header */}
        <header className="mb-6">
          <p className="text-xs tracking-[0.2em] uppercase text-slate-500">
            Personalised report
          </p>
          <div className="mt-1 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                {orgName} Discovery Assessment
              </h1>
              <p className="mt-1 text-sm text-slate-700">
                {takerName && (
                  <>
                    For <span className="font-medium">{takerName}</span>
                  </>
                )}
                {takerName && topProfileName && " · "}
                {topProfileName && (
                  <>
                    Top profile:{" "}
                    <span className="font-semibold">{topProfileName}</span>
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center justify-center rounded-lg border border-sky-600 px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50 bg-white"
            >
              Download PDF
            </button>
          </div>
        </header>

        {/* PART 1 – ABOUT THIS ASSESSMENT */}
        <section className="space-y-6 mt-4">
          <h2 className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-500">
            Part 1 · About this assessment
          </h2>

          {/* Welcome / intro letter */}
          <div className="rounded-2xl border bg-white p-6 md:p-7 shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Welcome</h3>
            <p className="text-sm text-slate-600 mb-2">
              A note from the creator of this framework.
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700">
              {orgName === "Team Puzzle"
                ? `Welcome to your Team Puzzle Discovery Report. I’m excited to be part of your journey as you uncover your natural strengths, communication style, and best-fit contribution in the workplace. This report is designed to give you deep insight into how you work best, where you thrive in a team, and how to align your role with your energy.

Team Puzzle was created as a practical system for understanding how different people fit together. When individuals understand their own style – and the styles of others – communication improves, performance lifts, and work feels more meaningful.

Use this report as a starting point for conversation, coaching, and practical action. The goal isn’t to label you, but to give you language for patterns that already exist, so you can make more conscious choices about how you lead, collaborate, and grow.`
                : `Welcome to your ${orgName} report. This report is designed to give you language for your natural strengths, working style, and contribution at work. Use it as a starting point for reflection, coaching conversations, and better collaboration with your team.`}
            </p>
          </div>

          {/* How to use this report */}
          <div className="rounded-2xl border bg-white p-6 md:p-7 shadow-sm">
            <h3 className="text-lg font-semibold mb-3">How to use this report</h3>
            <p className="text-sm text-slate-700 mb-3">
              This report combines your responses with {orgName}&apos;s profiling
              framework. It is designed to help you:
            </p>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
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
                Have better conversations with leaders, colleagues, or a coach
                about how you work best.
              </li>
            </ul>
            <p className="mt-3 text-sm text-slate-500">
              Use this as a starting point, not a verdict. The most useful
              insights come from reflection, real-world experimentation, and the
              conversations it sparks.
            </p>
          </div>

          {/* Framework story */}
          <div className="rounded-2xl border bg-white p-6 md:p-7 shadow-sm">
            <h3 className="text-lg font-semibold mb-3">
              The {orgName} framework
            </h3>
            <p className="text-sm text-slate-700 whitespace-pre-line">
              {orgName === "Team Puzzle"
                ? `High-performing teams don’t happen by accident – they’re built with intention, structure, and insight. The Team Puzzle Framework was developed to bridge the gap between untapped human potential and practical business results. It’s a top-down, ground-up approach to unlocking the genius that already exists in your people.

At its core, Team Puzzle helps organisations answer one fundamental question: “How do we get the best from each individual, and even better results from the team as a whole?”

When people are placed in roles that energise them, when teams communicate in a shared language, and when leadership knows where and how each person adds value, the entire culture transforms. Productivity rises, engagement increases, and trust becomes a business asset.

The Team Puzzle approach isn’t about “fixing” people – it’s about fitting people together. Just like a real puzzle, each person has a unique shape and contribution. This report is a practical tool to help you see how those pieces connect, so you can operate with more clarity, more confidence, and better results.`
                : `The framework behind this report uses four core Frequencies to describe the energy you bring to your work, and eight Profiles which blend those frequencies into recognisable patterns of contribution. It gives your organisation a clear, structured way to talk about strengths, collaboration, and the conditions where people do their best work.`}
            </p>
          </div>

          {/* Frequencies & Profiles explanation */}
          <div className="rounded-2xl border bg-white p-6 md:p-7 shadow-sm">
            <h3 className="text-base font-semibold mb-3">
              Understanding the four Frequencies & eight Profiles
            </h3>
            <div className="grid gap-6 md:grid-cols-2 text-sm text-slate-700">
              <div className="space-y-2">
                <p>
                  Frequencies describe the way you naturally think, decide, and
                  take action.
                </p>
                <p className="font-semibold mt-2">Frequencies (A–D)</p>
                <p>
                  <span className="font-semibold">Innovation</span> – Ideas,
                  creation, momentum, and challenging the status quo.
                </p>
                <p>
                  <span className="font-semibold">Influence</span> – People,
                  communication, motivation, and activation.
                </p>
                <p>
                  <span className="font-semibold">Implementation</span> –
                  Rhythm, process, and reliable delivery.
                </p>
                <p>
                  <span className="font-semibold">Insight</span> – Pattern
                  recognition, analysis, and perspective.
                </p>
              </div>
              <div className="space-y-2">
                <p>
                  Profiles blend these Frequencies into distinct patterns of
                  contribution. Together, they show how you naturally create
                  value in a team.
                </p>
                <p className="font-semibold mt-2">Profiles (P1–P8)</p>
                <p>
                  <span className="font-semibold">Visionary</span> – Future-
                  focused, ideas-driven, sees possibilities.
                </p>
                <p>
                  <span className="font-semibold">Catalyst</span> – Energetic,
                  action-oriented, drives momentum.
                </p>
                <p>
                  <span className="font-semibold">Motivator</span> – Encourages
                  others, builds energy and engagement.
                </p>
                <p>
                  <span className="font-semibold">Connector</span> – Builds
                  relationships, joins the dots between people and ideas.
                </p>
                <p>
                  <span className="font-semibold">Facilitator</span> – Creates
                  space for others, guides process and participation.
                </p>
                <p>
                  <span className="font-semibold">Coordinator</span> – Organised
                  and practical, keeps plans moving.
                </p>
                <p>
                  <span className="font-semibold">Controller</span> –
                  Analytical, detail-focused, ensures accuracy.
                </p>
                <p>
                  <span className="font-semibold">Optimiser</span> – Refines
                  systems, improves efficiency and outcomes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PART 2 – PERSONAL PROFILE */}
        <section className="mt-10 space-y-8">
          <h2 className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-500">
            Part 2 · Your profile in depth
          </h2>

          {/* Frequency summary */}
          <div className="rounded-2xl border bg-white p-6 md:p-7 shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Frequency summary</h3>
            <p className="text-sm text-slate-700 mb-4">
              Your strongest overall frequency is{" "}
              <span className="font-semibold">{topFreqLabel}</span>, which shapes
              how you approach problems and make decisions. Higher percentages
              indicate where you naturally spend more energy; lower percentages
              highlight areas that may feel less comfortable or more draining.
            </p>

            {result.frequency_labels.map((f) => (
              <div
                key={f.code}
                className="grid grid-cols-12 items-center gap-3 mb-2"
              >
                <div className="col-span-3 md:col-span-2 text-sm text-slate-700">
                  {f.name}
                </div>
                <div className="col-span-9 md:col-span-10">
                  <Bar pct={freqPercentages[f.code]} />
                  <div className="text-xs text-slate-500 mt-1">
                    {Math.round((freqPercentages[f.code] || 0) * 100)}%
                  </div>
                </div>
              </div>
            ))}

            <div className="mt-4 rounded-xl bg-sky-50 px-4 py-3 text-sm text-slate-800">
              <p className="font-semibold mb-1">
                Your dominant frequency: {topFreqLabel}
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <span className="font-semibold">Key traits:</span> Connecting
                  with people, communicating ideas, and bringing energy to
                  collaboration.
                </li>
                <li>
                  <span className="font-semibold">Motivators:</span> Feeling
                  engaged with others, being part of momentum, and seeing
                  progress.
                </li>
                <li>
                  <span className="font-semibold">Blind spots:</span> When this
                  energy is overused, it can crowd out other perspectives or
                  make it harder to slow down, reflect, or finish details.
                </li>
              </ul>
            </div>
          </div>

          {/* Profile mix */}
          <div className="rounded-2xl border bg-white p-6 md:p-7 shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Profile mix</h3>
            <p className="text-sm text-slate-700 mb-4">
              Your profile mix shows how your energy is distributed across the
              eight Profiles. Higher percentages highlight the styles you’re
              most likely to use day-to-day; lower percentages point to stretch
              or backup styles.
            </p>

            {result.profile_labels.map((p) => (
              <div
                key={p.code}
                className="grid grid-cols-12 items-center gap-3 mb-2"
              >
                <div className="col-span-4 md:col-span-3 text-sm text-slate-700">
                  {p.name}
                </div>
                <div className="col-span-8 md:col-span-9">
                  <Bar pct={profilePct(p.code)} />
                  <div className="text-xs text-slate-500 mt-1">
                    {Math.round(profilePct(p.code) * 100)}% match
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Primary / Secondary / Tertiary cards */}
          {primary && (
            <div className="grid gap-4 md:grid-cols-3">
              {[primary, secondary, tertiary].filter(Boolean).map((p, idx) => {
                const label =
                  idx === 0
                    ? "Primary profile"
                    : idx === 1
                    ? "Secondary"
                    : "Tertiary";
                return (
                  <div
                    key={p!.code}
                    className="rounded-2xl border bg-white p-5 shadow-sm flex flex-col"
                  >
                    <p className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-500">
                      {label}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">
                      {p!.name || "—"}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{p!.code}</p>
                    <p className="mt-2 text-sm text-slate-700">
                      {Math.round(p!.pct * 100)}% match
                    </p>
                    <div className="mt-3 text-sm text-slate-700 space-y-1">
                      <p>
                        <span className="font-semibold">Key traits:</span>{" "}
                        Creates value by leaning into the natural strengths of
                        this profile.
                      </p>
                      <p>
                        <span className="font-semibold">Motivators:</span>{" "}
                        Feels energised when working in situations that match
                        this style.
                      </p>
                      <p>
                        <span className="font-semibold">Blind spots:</span> May
                        overuse this pattern when under pressure, missing other
                        options.
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Energy matrix */}
          {primary && secondary && tertiary && (
            <div className="rounded-2xl border bg-sky-50 p-6 md:p-7">
              <h3 className="text-base font-semibold mb-2">Your energy matrix</h3>
              <p className="text-sm text-slate-700 mb-2">
                Your three strongest profiles – {primary.name}, {secondary.name}{" "}
                and {tertiary.name} – work together to shape how you think, act,
                and collaborate.
              </p>
              <p className="text-sm text-slate-700">
                When you lean into this combination intentionally, you’re more
                likely to feel energised and effective. The key is to notice
                when to stay in your natural strengths and when to borrow from
                other styles – for example, slowing down for more analysis, or
                asking for support on detailed follow-through.
              </p>
            </div>
          )}

          {/* Strengths & development areas as two cards */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border bg-white p-6 md:p-7 shadow-sm">
              <h3 className="text-base font-semibold mb-2">Strengths</h3>
              <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                <li>
                  Brings energy and movement into conversations and projects.
                </li>
                <li>
                  Builds relationships that help ideas gain traction and
                  support.
                </li>
                <li>
                  Is willing to engage with others to solve problems and keep
                  things moving.
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border bg-white p-6 md:p-7 shadow-sm">
              <h3 className="text-base font-semibold mb-2">
                Development areas
              </h3>
              <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                <li>
                  Leaving enough time for reflection and detailed planning
                  before acting.
                </li>
                <li>
                  Balancing enthusiasm with clear boundaries and realistic
                  commitments.
                </li>
                <li>
                  Inviting input from different styles, especially when making
                  complex or long-term decisions.
                </li>
              </ul>
            </div>
          </div>

          {/* Collaboration (real world examples) */}
          <div className="rounded-2xl border bg-white p-6 md:p-7 shadow-sm">
            <h3 className="text-base font-semibold mb-2">Collaboration</h3>
            <p className="text-sm text-slate-700">
              In a team context, your style is especially valuable when people
              need energy, connection, and practical follow-through. You’re
              likely to thrive in roles where you can bring people together,
              translate ideas into action, or keep communication flowing between
              different groups. Look for opportunities to pair with profiles
              that bring complementary strengths – for example, more detailed
              planning, deep analysis, or strategic long-range thinking.
            </p>
          </div>

          {/* Overall summary */}
          <div className="rounded-2xl border bg-white p-6 md:p-7 shadow-sm">
            <h3 className="text-base font-semibold mb-2">Overall summary</h3>
            <p className="text-sm text-slate-700">
              Overall, this report suggests that you bring{" "}
              {topProfileName.toLowerCase()}-style strengths into your work,
              powered by a dominant {topFreqLabel} frequency. When you focus on
              the environments and tasks that match this pattern – and stay
              aware of the potential blind spots – you are likely to feel more
              confident, effective, and fulfilled in your role.
            </p>
          </div>

          {/* Next steps */}
          <div className="rounded-2xl border bg-white p-6 md:p-7 shadow-sm">
            <h3 className="text-base font-semibold mb-2">Next steps</h3>
            <p className="text-sm text-slate-700 mb-3">
              A profile report is most powerful when it turns into conversation
              and action. Use these suggestions to decide what you want to do
              with your insights:
            </p>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1 mb-4">
              <li>
                Highlight 2–3 sentences in this report that feel most true for
                you.
              </li>
              <li>
                Note one strength you want to lean into more deliberately over
                the next month.
              </li>
              <li>
                Note one development area you would like to experiment with and
                get feedback on.
              </li>
            </ul>
            <button
              type="button"
              onClick={() => {
                // Placeholder action – can later deep-link to booking page / portal etc.
                if (typeof window !== "undefined") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
            >
              Continue
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 py-4 text-sm text-slate-500">
          © {currentYear} MindCanvas — Profiletest.ai
        </footer>
      </div>
    </div>
  );
}
