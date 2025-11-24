"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

type PersonalityKey = "FIRE" | "FLOW" | "FORM" | "FIELD";
type MindsetKey = "ORIGIN" | "MOMENTUM" | "VECTOR" | "ORBIT" | "QUANTUM";

type QscResults = {
  id: string;
  test_id: string;
  token: string;
  personality_totals: Record<string, number>;
  personality_percentages: Record<string, number>;
  mindset_totals: Record<string, number>;
  mindset_percentages: Record<string, number>;
  primary_personality: PersonalityKey;
  secondary_personality: PersonalityKey | null;
  primary_mindset: MindsetKey;
  secondary_mindset: MindsetKey | null;
  combined_profile_code: string;
  qsc_profile_id: string;
  created_at: string;
};

type QscProfile = {
  id: string;
  personality_code: string; // A/B/C/D
  mindset_level: number; // 1..5
  profile_code: string; // A1..D5
  profile_label: string; // e.g. "Fire Quantum"
  how_to_communicate: string | null;
  decision_style: string | null;
  business_challenges: string | null;
  trust_signals: string | null;
  offer_fit: string | null;
  sale_blockers: string | null;
  created_at: string;
};

type ReportApiPayload = {
  ok: boolean;
  results: QscResults;
  profile: QscProfile;
  sections: any[];
};

const PERSONALITY_LABELS: Record<PersonalityKey, string> = {
  FIRE: "Fire",
  FLOW: "Flow",
  FORM: "Form",
  FIELD: "Field",
};

const MINDSET_LABELS: Record<MindsetKey, string> = {
  ORIGIN: "Origin",
  MOMENTUM: "Momentum",
  VECTOR: "Vector",
  ORBIT: "Orbit",
  QUANTUM: "Quantum",
};

const MINDSET_ORDER: MindsetKey[] = [
  "ORIGIN",
  "MOMENTUM",
  "VECTOR",
  "ORBIT",
  "QUANTUM",
];

const PERSONALITY_ORDER: PersonalityKey[] = [
  "FIRE",
  "FLOW",
  "FORM",
  "FIELD",
];

const MATRIX_ROWS: MindsetKey[] = MINDSET_ORDER;
const MATRIX_COLS: PersonalityKey[] = PERSONALITY_ORDER;

/* -------------------------------------------------------------------------- */
/*                          One-Page Quantum Summary                          */
/* -------------------------------------------------------------------------- */

function OnePageSummary({
  results,
  profile,
}: {
  results: QscResults;
  profile: QscProfile;
}) {
  const primaryPersonalityLabel =
    PERSONALITY_LABELS[results.primary_personality] ??
    results.primary_personality;
  const secondaryPersonalityLabel = results.secondary_personality
    ? PERSONALITY_LABELS[results.secondary_personality] ??
      results.secondary_personality
    : null;

  const primaryMindsetLabel =
    MINDSET_LABELS[results.primary_mindset] ?? results.primary_mindset;
  const secondaryMindsetLabel = results.secondary_mindset
    ? MINDSET_LABELS[results.secondary_mindset] ?? results.secondary_mindset
    : null;

  const combinedLabel = profile.profile_label || results.combined_profile_code;

  const created = new Date(results.created_at);
  const createdStr = created.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const strengths: string[] = [
    `${primaryPersonalityLabel} energy at the ${primaryMindsetLabel} stage gives you strong momentum when you are clear on direction.`,
    `You naturally create movement and don’t stay stuck for long.`,
    `You are comfortable making decisions even when everything isn’t perfectly defined.`,
  ];

  const risks: string[] = [
    `You can move faster than your systems, which can create hidden friction or chaos.`,
    `Important details may be skipped when you are focused on speed or possibility.`,
    `You may carry too much alone instead of building stable support and structure.`,
  ];

  const priorities: string[] = [
    `Protect focused time each week for strategic thinking instead of only reacting to urgencies.`,
    `Tighten one or two key systems (delivery, sales, or communication) so your speed is backed by stability.`,
    `Create a simple rhythm for reviewing numbers and progress so you always know what is working.`,
  ];

  const nextStep =
    "Use this report to choose one system to simplify, one decision to make faster, and one behaviour to stabilise over the next 30 days.";

  return (
    <section className="mt-10 rounded-3xl border border-slate-800 bg-slate-950/70 px-6 py-7 md:px-8 md:py-8 shadow-[0_18px_60px_rgba(0,0,0,0.7)] space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-sky-300/80">
            One-Page Quantum Summary
          </p>
          <h2 className="mt-2 text-2xl md:text-3xl font-semibold text-slate-50">
            Your personal emotional, strategic &amp; scaling snapshot
          </h2>
          <p className="mt-1 text-sm text-slate-300 max-w-2xl">
            Use this page as your quick reference. It summarises who you are, where
            your business is, and what matters most over the next season.
          </p>
        </div>
        <div className="text-xs text-right text-slate-400">
          <div>Created at</div>
          <div className="font-medium text-slate-200">{createdStr}</div>
        </div>
      </header>

      {/* Quantum profile row */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-900/80 border border-sky-600/40 px-4 py-4 md:px-5 md:py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-300/90">
            Quantum Profile
          </p>
          <div className="mt-2 text-lg font-semibold text-slate-50">
            {combinedLabel}
          </div>
          <div className="mt-1 text-xs text-slate-300">
            Code:{" "}
            <span className="font-mono text-sky-200">
              {results.combined_profile_code}
            </span>
          </div>
          <dl className="mt-4 space-y-1.5 text-xs text-slate-200">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Primary personality</dt>
              <dd className="font-medium">{primaryPersonalityLabel}</dd>
            </div>
            {secondaryPersonalityLabel && (
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Secondary personality</dt>
                <dd className="font-medium">{secondaryPersonalityLabel}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Primary mindset</dt>
              <dd className="font-medium">{primaryMindsetLabel}</dd>
            </div>
            {secondaryMindsetLabel && (
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Secondary mindset</dt>
                <dd className="font-medium">{secondaryMindsetLabel}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 px-4 py-4 md:px-5 md:py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Stage
          </p>
          <div className="mt-2 text-sm text-slate-200">
            Your current growth focus is{" "}
            <span className="font-semibold text-sky-200">
              {primaryMindsetLabel}
            </span>
            . This stage asks you to balance your natural{" "}
            <span className="font-semibold text-sky-200">
              {primaryPersonalityLabel.toLowerCase()}
            </span>{" "}
            style with the structure and decisions needed for the next level.
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Think of this as your “home base” for the next 3–6 months. Most of your
            important decisions will happen from here.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 px-4 py-4 md:px-5 md:py-5 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Next step
            </p>
            <p className="mt-2 text-sm text-slate-200">{nextStep}</p>
          </div>
          <div className="mt-3 text-[11px] text-slate-400">
            Tip: screenshot or print this page and keep it visible in your workspace as
            your decision filter.
          </div>
        </div>
      </div>

      {/* Strengths / Risks / Priorities */}
      <div className="grid gap-4 md:grid-cols-3 mt-4">
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 px-4 py-4 md:px-5 md:py-5">
          <h3 className="text-sm font-semibold text-slate-50">
            Strengths you can lean on
          </h3>
          <ul className="mt-3 space-y-2 text-xs text-slate-200 list-disc list-inside">
            {strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 px-4 py-4 md:px-5 md:py-5">
          <h3 className="text-sm font-semibold text-slate-50">
            Risks &amp; patterns to watch
          </h3>
          <ul className="mt-3 space-y-2 text-xs text-slate-200 list-disc list-inside">
            {risks.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 px-4 py-4 md:px-5 md:py-5">
          <h3 className="text-sm font-semibold text-slate-50">
            Top priorities (next 90 days)
          </h3>
          <ul className="mt-3 space-y-2 text-xs text-slate-200 list-disc list-inside">
            {priorities.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                 Intro + “How to use this report” section                   */
/* -------------------------------------------------------------------------- */

function IntroAndHowToUse() {
  return (
    <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/70 px-6 py-6 md:px-8 md:py-7 shadow-[0_18px_50px_rgba(0,0,0,0.65)] space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* INTRODUCTION */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300/80">
            Introduction
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-50">
            Your personal growth &amp; business direction guide
          </h2>
          <p className="mt-3 text-sm text-slate-200">
            This report gives you a clear understanding of who you are, how you work,
            and what your business needs next. It is designed to be simple, practical,
            and focused on helping you take confident action.
          </p>

          <p className="mt-4 text-xs font-semibold text-slate-300">
            You will learn two important things about yourself:
          </p>
          <ul className="mt-2 space-y-2 text-sm text-slate-200">
            <li>
              <span className="font-semibold text-sky-200">
                Your Personality Layer
              </span>
              <span className="text-slate-300">
                {" "}
                – how you naturally think, act, and make decisions.
              </span>
            </li>
            <li>
              <span className="font-semibold text-sky-200">
                Your Mindset Layer
              </span>
              <span className="text-slate-300">
                {" "}
                – where your business is right now and what stage of growth you are
                in.
              </span>
            </li>
          </ul>

          <p className="mt-3 text-sm text-slate-200">
            Together, these create your{" "}
            <span className="font-semibold text-sky-200">Quantum Profile</span>. Your
            Quantum Profile shows your strengths, blind spots, patterns, and the best
            way for you to grow.
          </p>

          <p className="mt-3 text-xs text-slate-300">This report includes:</p>
          <ul className="mt-2 grid gap-x-4 gap-y-1 text-xs text-slate-200 md:grid-cols-2">
            <li>Clear explanations</li>
            <li>Examples</li>
            <li>Steps you can follow</li>
            <li>Prompts to help you reflect</li>
            <li>A 30-day plan</li>
            <li>A simple growth roadmap</li>
          </ul>

          <p className="mt-4 text-xs text-slate-300">
            Read it slowly. Use it as a guide. Come back to it often. This is your
            personal strategic growth plan.
          </p>
        </div>

        {/* HOW TO USE THIS REPORT */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300/80">
            How to use this report
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-50">
            Turn insight into focused, confident action
          </h2>
          <p className="mt-3 text-sm text-slate-200">
            To get the most value from this:
          </p>

          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            <li>
              <span className="font-semibold text-sky-200">
                Start with the Profile Summary
              </span>{" "}
              – understand your natural style and energy.
            </li>
            <li>
              <span className="font-semibold text-sky-200">
                Study the Personality Layer
              </span>{" "}
              – this explains why you act the way you do.
            </li>
            <li>
              <span className="font-semibold text-sky-200">
                Read the Mindset Layer
              </span>{" "}
              – this shows what your business needs right now.
            </li>
            <li>
              <span className="font-semibold text-sky-200">
                Pay close attention to the Combined Pattern
              </span>{" "}
              – this part gives you the real insight.
            </li>
            <li>
              <span className="font-semibold text-sky-200">
                Use the Strategic Priorities
              </span>{" "}
              – these are your most important actions.
            </li>
            <li>
              <span className="font-semibold text-sky-200">
                Follow the 30-day Action Plan
              </span>{" "}
              – this turns clarity into forward movement.
            </li>
            <li>
              <span className="font-semibold text-sky-200">
                Use the Roadmap to stay on track
              </span>{" "}
              – it shows the next steps and the expected timeline.
            </li>
            <li>
              <span className="font-semibold text-sky-200">
                Work through the Reflection Prompts
              </span>{" "}
              – these help you stay aligned and aware.
            </li>
            <li>
              <span className="font-semibold text-sky-200">
                Keep the One-Page Summary nearby
              </span>{" "}
              – this is your quick, at-a-glance guide.
            </li>
          </ul>

          <p className="mt-4 text-xs text-slate-300">
            This report gives you direction, simplicity, and momentum without
            overwhelming you.
          </p>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                           Personality Layer section                        */
/* -------------------------------------------------------------------------- */

function normalizeField(raw: string | null, fallback: string): string {
  const t = (raw ?? "").trim();
  if (!t || t.toLowerCase().startsWith("[todo")) return fallback;
  return t;
}

function PersonalityLayerSection({
  results,
  profile,
}: {
  results: QscResults;
  profile: QscProfile;
}) {
  const primaryPersonalityLabel =
    PERSONALITY_LABELS[results.primary_personality] ??
    results.primary_personality;

  const howToCommunicate = normalizeField(
    profile.how_to_communicate,
    "This section will be tailored for this profile. For now, notice how clearly expressed communication, simple next steps and consistent follow-through support you."
  );
  const decisionStyle = normalizeField(
    profile.decision_style,
    "You tend to make decisions based on a mix of instinct and pattern recognition. You move faster when there is momentum and clarity."
  );
  const businessChallenges = normalizeField(
    profile.business_challenges,
    "Your main challenges often sit around balancing growth with stability — keeping delivery, cashflow and team alignment in step with your ambition."
  );
  const trustSignals = normalizeField(
    profile.trust_signals,
    "You feel most confident when leaders are clear, consistent and honest, and when there is visible progress towards meaningful outcomes."
  );
  const offerFit = normalizeField(
    profile.offer_fit,
    "You respond well to offers that save time, remove friction and create momentum without adding unnecessary complexity."
  );
  const saleBlockers = normalizeField(
    profile.sale_blockers,
    "You hesitate when things feel vague, slow, over-engineered or disconnected from real-world results."
  );

  return (
    <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-950/80 px-6 py-7 md:px-8 md:py-8 shadow-[0_18px_55px_rgba(0,0,0,0.65)] space-y-6">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300/80">
          Personality Layer
        </p>
        <h2 className="text-2xl font-semibold text-slate-50">
          How your natural {primaryPersonalityLabel.toLowerCase()} energy shows up
          day-to-day
        </h2>
        <p className="text-sm text-slate-300 max-w-3xl">
          This section looks only at you — your emotional wiring, thinking patterns
          and default behaviours. Later, the Mindset Layer will show how this interacts
          with the current stage of your business.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 px-4 py-4 md:px-5 md:py-5">
          <h3 className="text-sm font-semibold text-slate-50">
            How you show up
          </h3>
          <p className="mt-2 text-xs text-slate-200">
            Your {primaryPersonalityLabel.toLowerCase()} pattern influences how you
            think, act and relate to people around you. It shapes the pace you prefer,
            how quickly you move into action, and what you pay attention to first.
          </p>
          <p className="mt-3 text-xs text-slate-300">
            Use this as a neutral mirror — not a judgement. The goal is awareness, not
            perfection.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 px-4 py-4 md:px-5 md:py-5">
          <h3 className="text-sm font-semibold text-slate-50">
            What energises &amp; drains you
          </h3>
          <p className="mt-2 text-xs text-slate-200">
            You are energised by environments that match your natural pace and style,
            and drained when you have to constantly operate against your wiring.
          </p>
          <ul className="mt-3 space-y-1.5 text-xs text-slate-200 list-disc list-inside">
            <li>
              <span className="font-semibold">Energises:</span> work that matches your
              preferred speed, gives you autonomy, and lets you lean into your natural
              strengths.
            </li>
            <li>
              <span className="font-semibold">Drains:</span> situations where you feel
              stuck, over-controlled, or responsible for every detail with no support.
            </li>
          </ul>
          <p className="mt-3 text-[11px] text-slate-400">
            Noticing this helps you structure your week around high-energy work and
            protect yourself from unnecessary burnout.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 px-4 py-4 md:px-5 md:py-5">
          <h3 className="text-sm font-semibold text-slate-50">
            What people notice about you
          </h3>
          <p className="mt-2 text-xs text-slate-200">
            Others experience your personality before they understand your strategy.
            The way you enter a room, respond to pressure and make decisions all sends
            a signal.
          </p>
          <ul className="mt-3 space-y-1.5 text-xs text-slate-200 list-disc list-inside">
            <li>
              <span className="font-semibold">Appreciated:</span> your energy when it
              is focused, your ability to move things forward, and your willingness to
              carry responsibility.
            </li>
            <li>
              <span className="font-semibold">Misunderstood:</span> at times, your
              speed or intensity may be read as impatience, pressure or emotional
              distance.
            </li>
          </ul>
        </div>
      </div>

      {/* Persona fields from qsc_profiles */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 px-4 py-4 md:px-5 md:py-5">
          <h3 className="text-sm font-semibold text-slate-50">
            How you communicate
          </h3>
          <p className="mt-2 text-xs text-slate-200 whitespace-pre-line">
            {howToCommunicate}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 px-4 py-4 md:px-5 md:py-5">
          <h3 className="text-sm font-semibold text-slate-50">
            Decision style
          </h3>
          <p className="mt-2 text-xs text-slate-200 whitespace-pre-line">
            {decisionStyle}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 px-4 py-4 md:px-5 md:py-5">
          <h3 className="text-sm font-semibold text-slate-50">
            Core business challenges
          </h3>
          <p className="mt-2 text-xs text-slate-200 whitespace-pre-line">
            {businessChallenges}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 px-4 py-4 md:px-5 md:py-5">
          <h3 className="text-sm font-semibold text-slate-50">
            Trust signals
          </h3>
          <p className="mt-2 text-xs text-slate-200 whitespace-pre-line">
            {trustSignals}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 px-4 py-4 md:px-5 md:py-5">
          <h3 className="text-sm font-semibold text-slate-50">
            Best offer fit
          </h3>
          <p className="mt-2 text-xs text-slate-200 whitespace-pre-line">
            {offerFit}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 px-4 py-4 md:px-5 md:py-5">
          <h3 className="text-sm font-semibold text-slate-50">
            Sale blockers &amp; friction points
          </h3>
          <p className="mt-2 text-xs text-slate-200 whitespace-pre-line">
            {saleBlockers}
          </p>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-slate-400">
        As you and your coach refine this profile, these descriptions can be updated to
        match your exact language and examples.
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Main Report Page                             */
/* -------------------------------------------------------------------------- */

export default function QscReportPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [data, setData] = useState<ReportApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch(
          `/api/public/qsc/${encodeURIComponent(token)}/report`,
          { cache: "no-store" }
        );

        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(
            `Non-JSON response (${res.status}): ${text.slice(0, 200)}`
          );
        }

        const j = (await res.json()) as ReportApiPayload;
        if (!res.ok || (j as any).ok === false) {
          throw new Error((j as any).error || `HTTP ${res.status}`);
        }

        if (alive) setData(j);
      } catch (e: any) {
        if (alive) setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  const results = data?.results;
  const profile = data?.profile;

  const freqChartData = useMemo(
    () =>
      results
        ? PERSONALITY_ORDER.map((key) => ({
            name: PERSONALITY_LABELS[key],
            code: key,
            value: results.personality_percentages?.[key] ?? 0,
          }))
        : [],
    [results]
  );

  const mindsetChartData = useMemo(
    () =>
      results
        ? MINDSET_ORDER.map((key) => ({
            name: MINDSET_LABELS[key],
            code: key,
            value: results.mindset_percentages?.[key] ?? 0,
          }))
        : [],
    [results]
  );

  const activeRow = results?.primary_mindset;
  const activeCol = results?.primary_personality;
  const activeCode = results?.combined_profile_code ?? profile?.profile_code;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <main className="mx-auto max-w-6xl px-4 py-10">
          <p className="text-sm text-slate-300">Loading report…</p>
        </main>
      </div>
    );
  }

  if (err || !results || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <main className="mx-auto max-w-6xl px-4 py-10 space-y-4">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-slate-300">
            We couldn&apos;t load your Quantum Source Code report.
          </p>
          <pre className="mt-2 rounded-xl bg-slate-900/90 border border-slate-800 px-4 py-3 text-xs text-slate-100 whitespace-pre-wrap">
            {err || "No data"}
          </pre>
          <div className="text-xs text-slate-500">
            Debug endpoint:{" "}
            <code className="font-mono">
              /api/public/qsc/{token}/report
            </code>
          </div>
          <Link
            href={`/qsc/${encodeURIComponent(token)}`}
            className="inline-flex mt-4 px-4 py-2 rounded-xl bg-sky-600 text-xs font-medium text-white hover:bg-sky-500"
          >
            Back to Quantum Summary
          </Link>
        </main>
      </div>
    );
  }

  const primaryPersonalityLabel =
    PERSONALITY_LABELS[results.primary_personality] ??
    results.primary_personality;
  const primaryMindsetLabel =
    MINDSET_LABELS[results.primary_mindset] ?? results.primary_mindset;

  const todayStr = new Date().toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-50">
      <main className="mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-8">
        {/* Top header */}
        <header className="space-y-3 border-b border-slate-800 pb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.26em] uppercase text-sky-300/80">
                QSC Entrepreneur — Strategic Growth Report
              </p>
              <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-slate-50">
                Your Personal Emotional, Strategic &amp; Scaling Blueprint
              </h1>
              <p className="mt-3 text-sm text-slate-300 max-w-2xl">
                This report combines your Buyer Frequency Type and Buyer Mindset
                Level into one Quantum Source Code profile so you can see exactly
                how to grow without burning out or creating chaos.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-300">
                <div>
                  Quantum Profile:{" "}
                  <span className="font-semibold text-sky-200">
                    {primaryPersonalityLabel} × {primaryMindsetLabel}
                  </span>{" "}
                  <span className="font-mono text-slate-400">
                    ({results.combined_profile_code})
                  </span>
                </div>
                <div>Prepared for: You</div>
                <div>Date: {todayStr}</div>
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end gap-3">
              <div className="text-xs text-slate-400">
                Powered by{" "}
                <span className="font-semibold text-slate-100">
                  MindCanvas
                </span>{" "}
                • Profiletest.ai
              </div>
              <Link
                href={`/qsc/${encodeURIComponent(token)}`}
                className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-medium text-slate-50 hover:border-sky-500 hover:bg-slate-900/90"
              >
                ← Back to Quantum Summary
              </Link>
            </div>
          </div>
        </header>

        {/* Intro + How to use */}
        <IntroAndHowToUse />

        {/* Top row: pie, bar, matrix */}
        <section className="grid gap-5 md:grid-cols-3">
          {/* Buyer Frequency Type (pie) */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 px-5 py-5 shadow-[0_18px_50px_rgba(0,0,0,0.7)] flex flex-col">
            <h2 className="text-sm font-semibold text-slate-50">
              Buyer Frequency Type
            </h2>
            <p className="mt-1 text-xs text-slate-300">
              Distribution of your emotional and behavioural style across the four
              QSC frequencies.
            </p>
            <div className="mt-4 flex-1">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={freqChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {freqChartData.map((entry, idx) => (
                      <Cell
                        key={entry.code}
                        fill={
                          ["#38bdf8", "#22c55e", "#eab308", "#a855f7"][idx % 4]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) =>
                      `${Number(value)
                        .toFixed(1)
                        .replace(/\.0$/, "")}%`
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mindset levels bar chart */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 px-5 py-5 shadow-[0_18px_50px_rgba(0,0,0,0.7)] flex flex-col">
            <h2 className="text-sm font-semibold text-slate-50">
              Buyer Mindset Levels
            </h2>
            <p className="mt-1 text-xs text-slate-300">
              Where your business energy is currently focused across the five
              Quantum stages.
            </p>
            <div className="mt-4 flex-1">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={mindsetChartData}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#cbd5f5" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    width={24}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    formatter={(value: any) =>
                      `${Number(value)
                        .toFixed(1)
                        .replace(/\.0$/, "")}%`
                    }
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#38bdf8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Buyer Persona Matrix */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 px-5 py-5 shadow-[0_18px_50px_rgba(0,0,0,0.7)] flex flex-col">
            <h2 className="text-sm font-semibold text-slate-50">
              Buyer Persona Matrix
            </h2>
            <p className="mt-1 text-xs text-slate-300">
              Your combined profile sits at the intersection of your Buyer
              Frequency Type (left to right) and Buyer Mindset Level (top to
              bottom).
            </p>

            <div className="mt-4 flex-1 overflow-x-auto">
              <div className="inline-grid grid-cols-[auto_repeat(5,minmax(0,1fr))] gap-1 text-[10px]">
                {/* Header row */}
                <div />
                {MATRIX_COLS.map((col) => (
                  <div
                    key={col}
                    className="px-2 py-1 text-center text-slate-400"
                  >
                    {PERSONALITY_LABELS[col]}
                  </div>
                ))}

                {/* Body rows */}
                {MATRIX_ROWS.map((row) => (
                  <div key={row} className="contents">
                    <div className="px-2 py-1 text-right text-slate-400">
                      {MINDSET_LABELS[row]}
                    </div>
                    {MATRIX_COLS.map((col) => {
                      const code = `${col[0]}${
                        MINDSET_ORDER.indexOf(row) + 1
                      }`;
                      const isActive =
                        row === activeRow &&
                        col === activeCol &&
                        code === profile.profile_code;

                      return (
                        <button
                          key={col}
                          type="button"
                          className={[
                            "h-9 min-w-[44px] rounded-lg border text-[11px] font-medium transition",
                            isActive
                              ? "border-sky-400 bg-sky-500/20 text-sky-50 shadow-[0_0_0_1px_rgba(56,189,248,0.6)]"
                              : "border-slate-700/70 bg-slate-900/70 text-slate-300 hover:border-sky-500/60 hover:bg-slate-900",
                          ].join(" ")}
                        >
                          {code}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 text-[11px] text-slate-400">
              Active profile:{" "}
              <span className="font-semibold text-slate-100">
                {profile.profile_label} ({activeCode})
              </span>
            </div>
          </div>
        </section>

        {/* One-page summary */}
        <OnePageSummary results={results} profile={profile} />

        {/* Personality layer */}
        <PersonalityLayerSection results={results} profile={profile} />
      </main>
    </div>
  );
}
