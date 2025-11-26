"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PersonalityKey = "FIRE" | "FLOW" | "FORM" | "FIELD";
type MindsetKey = "ORIGIN" | "MOMENTUM" | "VECTOR" | "ORBIT" | "QUANTUM";

type QscResults = {
  id: string;
  test_id: string;
  token: string;
  personality_totals: Record<PersonalityKey, number>;
  personality_percentages: Record<PersonalityKey, number>;
  mindset_totals: Record<MindsetKey, number>;
  mindset_percentages: Record<MindsetKey, number>;
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
  profile_code: string; // e.g. A5
  profile_label: string; // e.g. Fire Quantum

  how_to_communicate: string | null;
  decision_style: string | null;
  business_challenges: string | null;
  trust_signals: string | null;
  offer_fit: string | null;
  sale_blockers: string | null;

  emotional_alignment_stabilises?: string | null;
  emotional_alignment_destabilises?: string | null;
  emotional_alignment_patterns?: string | null;

  priority_1?: string | null;
  priority_2?: string | null;
  priority_3?: string | null;
};

type ApiResponse = {
  ok: boolean;
  results: QscResults;
  profile: QscProfile | null;
  sections?: any[];
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

const PERSONALITY_ORDER: PersonalityKey[] = ["FIRE", "FLOW", "FORM", "FIELD"];
const MINDSET_ORDER: MindsetKey[] = [
  "ORIGIN",
  "MOMENTUM",
  "VECTOR",
  "ORBIT",
  "QUANTUM",
];

function normalizeField(value: unknown, fallback: string): string {
  if (value == null) return fallback;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : fallback;
  }
  if (Array.isArray(value)) {
    const joined = (value as any[]).join("\n").trim();
    return joined.length ? joined : fallback;
  }
  return fallback;
}

/** Build a CSS conic-gradient string for the personality pie chart. */
function buildPersonalityGradient(
  percentages: Record<PersonalityKey, number>
): string {
  const colors: Record<PersonalityKey, string> = {
    FIRE: "#f97316", // orange
    FLOW: "#0ea5e9", // sky
    FORM: "#22c55e", // green
    FIELD: "#a855f7", // purple
  };

  let current = 0;
  const segments: string[] = [];

  for (const key of PERSONALITY_ORDER) {
    const pct = Math.max(0, percentages[key] || 0);
    const next = current + pct * 3.6; // % → degrees
    if (pct > 0) {
      segments.push(`${colors[key]} ${current.toFixed(1)}deg ${next.toFixed(1)}deg`);
    }
    current = next;
  }

  if (segments.length === 0) {
    return "conic-gradient(#1e293b 0deg 360deg)";
  }

  return `conic-gradient(${segments.join(", ")})`;
}

function PersonalityPieChart({
  percentages,
}: {
  percentages: Record<PersonalityKey, number>;
}) {
  const gradient = buildPersonalityGradient(percentages);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center">
      <div className="flex items-center justify-center">
        <div
          className="h-32 w-32 md:h-40 md:w-40 rounded-full shadow-[0_18px_45px_rgba(15,23,42,0.7)] border border-slate-900/60"
          style={{ backgroundImage: gradient }}
        >
          <div className="h-full w-full flex items-center justify-center">
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-slate-950/95 border border-slate-800 flex items-center justify-center">
              <span className="text-[11px] text-slate-200 uppercase tracking-[0.18em] text-center px-2">
                Buyer Frequency
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-3 text-xs text-slate-100">
        {PERSONALITY_ORDER.map((key) => (
          <div key={key} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  backgroundColor:
                    key === "FIRE"
                      ? "#f97316"
                      : key === "FLOW"
                      ? "#0ea5e9"
                      : key === "FORM"
                      ? "#22c55e"
                      : "#a855f7",
                }}
              />
              <span className="font-medium">
                {PERSONALITY_LABELS[key]}
              </span>
            </div>
            <span className="text-slate-300">
              {Math.round((percentages[key] || 0) * 10) / 10}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MindsetBarChart({
  percentages,
}: {
  percentages: Record<MindsetKey, number>;
}) {
  return (
    <div className="space-y-2">
      {MINDSET_ORDER.map((key) => {
        const pct = Math.max(0, Math.min(100, percentages[key] || 0));
        return (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-100">
              <span className="font-medium">{MINDSET_LABELS[key]}</span>
              <span>{Math.round(pct * 10) / 10}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Simple 4x5 buyer persona matrix; highlights the primary combo cell. */
function PersonaMatrix({ results }: { results: QscResults }) {
  const primaryP = results.primary_personality;
  const primaryM = results.primary_mindset;

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white/95 px-6 py-6 md:px-7 md:py-7 shadow-[0_18px_55px_rgba(15,23,42,0.45)]">
      <header className="mb-4 space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
          Buyer Persona Matrix
        </p>
        <h3 className="text-lg md:text-xl font-semibold text-slate-900">
          Where your buyer frequency meets your mindset level
        </h3>
        <p className="text-xs md:text-sm text-slate-700 max-w-3xl">
          Each cell represents a different Quantum buyer persona. Your primary
          pattern is highlighted — this is where your emotional wiring and
          current business stage meet.
        </p>
      </header>

      <div className="overflow-x-auto">
        <div className="inline-grid grid-cols-[auto_repeat(4,minmax(64px,1fr))] text-[11px] md:text-xs">
          {/* top header row */}
          <div className="border border-slate-200 bg-slate-50/70 p-2 text-slate-500 text-[10px] uppercase tracking-[0.18em]">
            Mindset →
          </div>
          {PERSONALITY_ORDER.map((p) => (
            <div
              key={p}
              className="border border-slate-200 bg-slate-50/80 px-2 py-2 text-center font-medium text-slate-800"
            >
              {PERSONALITY_LABELS[p]}
            </div>
          ))}

          {/* rows */}
          {MINDSET_ORDER.map((m) => (
            <>
              <div
                key={`row-label-${m}`}
                className="border border-slate-200 bg-slate-50/80 px-2 py-2 font-medium text-slate-800"
              >
                {MINDSET_LABELS[m]}
              </div>
              {PERSONALITY_ORDER.map((p) => {
                const isPrimary = p === primaryP && m === primaryM;
                const isSecondary =
                  p === (results.secondary_personality as PersonalityKey | null) &&
                  m === (results.secondary_mindset as MindsetKey | null);

                let bg = "bg-slate-900/90";
                let border = "border-slate-700/70";
                let text = "text-slate-200";
                if (isPrimary) {
                  bg =
                    "bg-gradient-to-br from-sky-500 via-emerald-400 to-amber-300";
                  border = "border-amber-200";
                  text = "text-slate-900";
                } else if (isSecondary) {
                  bg = "bg-sky-900/80";
                  border = "border-sky-500/70";
                  text = "text-slate-50";
                }

                return (
                  <div
                    key={`${m}-${p}`}
                    className={`border ${border} ${bg} px-2 py-3 flex items-center justify-center`}
                  >
                    <span
                      className={`text-[10px] font-medium ${text} text-center`}
                    >
                      {PERSONALITY_LABELS[p]} / {MINDSET_LABELS[m]}
                    </span>
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------- Report Sections ------------------- */

function IntroSection({
  results,
  profile,
}: {
  results: QscResults;
  profile: QscProfile | null;
}) {
  const primaryPersonalityLabel =
    PERSONALITY_LABELS[results.primary_personality];
  const primaryMindsetLabel = MINDSET_LABELS[results.primary_mindset];

  const quantumProfileLabel =
    profile?.profile_label ||
    `${primaryPersonalityLabel} ${primaryMindsetLabel}`;

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/95 px-6 py-7 md:px-8 md:py-8 shadow-[0_18px_55px_rgba(15,23,42,0.45)] space-y-4">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
          Strategic Growth Report
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
          QSC Entrepreneur — Strategic Growth Report
        </h1>
        <p className="text-sm text-slate-700">
          Your Personal Emotional, Strategic &amp; Scaling Blueprint
        </p>
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Quantum Profile
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {quantumProfileLabel}
          </p>
          <p className="mt-2 text-sm text-slate-700 max-w-xl">
            This report gives you a clear understanding of who you are, how you
            work, and what your business needs next. It is designed to be
            simple, practical, and focused on helping you take confident action.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 max-w-xs">
          <p className="font-semibold text-slate-900">What you&apos;ll see:</p>
          <ul className="mt-1 space-y-1 list-disc list-inside">
            <li>Your Personality Layer (how you naturally act & decide)</li>
            <li>Your Mindset Layer (where your business is right now)</li>
            <li>Your combined Quantum Profile &amp; strategic priorities</li>
          </ul>
        </div>
      </div>

      <div className="pt-2 border-t border-dashed border-slate-200 mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Your Personality Layer
          </h3>
          <p className="mt-1 text-xs text-slate-700">
            How you naturally think, act and make decisions. This is your
            emotional wiring and energetic pattern — it doesn&apos;t change
            overnight, which is why it&apos;s such a powerful anchor.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Your Mindset Layer
          </h3>
          <p className="mt-1 text-xs text-slate-700">
            Where your business is right now and what stage of growth you&apos;re
            in. These needs shift as you grow — which is why you can&apos;t keep
            scaling with yesterday&apos;s strategy.
          </p>
        </div>
      </div>
    </section>
  );
}

function HowToUseSection() {
  return (
    <section className="mt-6 rounded-3xl border border-slate-200/80 bg-white/95 px-6 py-6 md:px-8 md:py-7 shadow-[0_20px_55px_rgba(15,23,42,0.45)]">
      <h2 className="text-lg md:text-xl font-semibold text-slate-900">
        How to use this report
      </h2>
      <p className="mt-2 text-sm text-slate-700">
        This is your personal strategic growth guide — not a personality box.
        Move through it slowly and come back often.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2 text-xs text-slate-700">
        <ul className="space-y-1.5 list-disc list-inside">
          <li>Start with the Profile Summary to understand your core pattern.</li>
          <li>
            Study the Personality Layer to see why you act, respond and decide
            the way you do.
          </li>
          <li>
            Read the Mindset Layer to understand what your business needs at this
            stage.
          </li>
          <li>
            Pay close attention to the Combined Pattern — this is where the real
            insight lives.
          </li>
        </ul>
        <ul className="space-y-1.5 list-disc list-inside">
          <li>
            Use the Strategic Priorities to decide what actually matters in the
            next 90 days.
          </li>
          <li>
            Follow the 30-Day Action Plan (when enabled) to turn clarity into
            movement.
          </li>
          <li>
            Use the Reflection Prompts to stay emotionally and strategically
            aligned.
          </li>
          <li>
            Keep the One Page Summary handy as your quick reference during the
            week.
          </li>
        </ul>
      </div>
    </section>
  );
}

function OnePageSummarySection({
  results,
  profile,
}: {
  results: QscResults;
  profile: QscProfile | null;
}) {
  const primaryPersonalityLabel =
    PERSONALITY_LABELS[results.primary_personality];
  const primaryMindsetLabel = MINDSET_LABELS[results.primary_mindset];

  const strengthsFallback =
    "You bring a powerful mix of drive, pattern-recognition and forward momentum. You naturally look for the fastest path between vision and execution, and you are willing to make bold decisions when the path feels clear.";
  const risksFallback =
    "Your biggest risks often appear when pace outruns structure: decisions made faster than systems can hold, offers created faster than delivery can sustain, or emotional bandwidth stretched past what your calendar can realistically support.";

  const strengths = normalizeField(
    profile?.offer_fit,
    strengthsFallback
  );
  const risks = normalizeField(
    profile?.business_challenges,
    risksFallback
  );

  const p1 = normalizeField(
    profile?.priority_1,
    "Clarify and stabilise your core offer(s) so that delivery, pricing and capacity match the stage you are in."
  );
  const p2 = normalizeField(
    profile?.priority_2,
    "Create a simple weekly rhythm that protects time for strategic thinking, decision-making and rest."
  );
  const p3 = normalizeField(
    profile?.priority_3,
    "Align your team, tools or support around the way you actually work, instead of forcing yourself into someone else’s system."
  );

  return (
    <section className="mt-8 rounded-3xl border border-amber-200/80 bg-amber-50/95 px-6 py-7 md:px-8 md:py-8 shadow-[0_24px_60px_rgba(15,23,42,0.55)] space-y-6">
      <header className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">
          One-page Quantum summary
        </p>
        <h2 className="text-xl font-semibold text-slate-900">
          Your at-a-glance Quantum Profile
        </h2>
        <p className="text-sm text-slate-800">
          This is the snapshot you can keep open while planning your quarter,
          designing offers, or making big decisions.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3 text-sm">
        <div className="rounded-2xl bg-white/90 border border-amber-200 px-4 py-4 flex flex-col">
          <h3 className="text-xs font-semibold text-slate-900">
            Quantum Profile
          </h3>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {profile?.profile_label ||
              `${primaryPersonalityLabel} ${primaryMindsetLabel}`}
          </p>
          <p className="mt-3 text-xs text-slate-700">
            Personality:{" "}
            <span className="font-medium">{primaryPersonalityLabel}</span>
            {results.secondary_personality && (
              <>
                {" "}
                (with{" "}
                <span className="font-medium">
                  {PERSONALITY_LABELS[results.secondary_personality]}
                </span>{" "}
                influence)
              </>
            )}
            .
          </p>
          <p className="mt-1 text-xs text-slate-700">
            Mindset Stage:{" "}
            <span className="font-medium">
              {primaryMindsetLabel} (Level {results.primary_mindset === "ORIGIN"
                ? 1
                : results.primary_mindset === "MOMENTUM"
                ? 2
                : results.primary_mindset === "VECTOR"
                ? 3
                : results.primary_mindset === "ORBIT"
                ? 4
                : 5}
            </span>
            )
          </p>
        </div>

        <div className="rounded-2xl bg-white/90 border border-amber-200 px-4 py-4 flex flex-col">
          <h3 className="text-xs font-semibold text-slate-900">Strengths</h3>
          <p className="mt-2 text-xs text-slate-700 whitespace-pre-line flex-1">
            {strengths}
          </p>
          <h3 className="mt-4 text-xs font-semibold text-slate-900">Risks</h3>
          <p className="mt-2 text-xs text-slate-700 whitespace-pre-line">
            {risks}
          </p>
        </div>

        <div className="rounded-2xl bg-white/90 border border-amber-200 px-4 py-4 flex flex-col">
          <h3 className="text-xs font-semibold text-slate-900">
            Top strategic priorities
          </h3>
          <ol className="mt-2 space-y-1.5 text-xs text-slate-700 list-decimal list-inside flex-1">
            <li>{p1}</li>
            <li>{p2}</li>
            <li>{p3}</li>
          </ol>
          <p className="mt-3 text-[11px] text-slate-500">
            If you only act on these three for the next 90 days, you will feel a
            meaningful shift in how you work and how your business holds growth.
          </p>
        </div>
      </div>
    </section>
  );
}

function ChartsSection({ results }: { results: QscResults }) {
  return (
    <section className="mt-8 grid gap-6 md:grid-cols-2">
      <div className="rounded-3xl border border-slate-200/80 bg-slate-950/80 px-6 py-6 md:px-7 md:py-7 shadow-[0_20px_55px_rgba(15,23,42,0.7)]">
        <h2 className="text-sm font-semibold text-slate-50">
          Buyer Frequency Type
        </h2>
        <p className="mt-1 text-[11px] text-slate-300">
          Your emotional &amp; energetic style across Fire, Flow, Form and
          Field.
        </p>
        <div className="mt-4">
          <PersonalityPieChart
            percentages={results.personality_percentages}
          />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/80 bg-slate-950/80 px-6 py-6 md:px-7 md:py-7 shadow-[0_20px_55px_rgba(15,23,42,0.7)]">
        <h2 className="text-sm font-semibold text-slate-50">
          Buyer Mindset Levels
        </h2>
        <p className="mt-1 text-[11px] text-slate-300">
          How your energy is distributed across the 5 Quantum stages.
        </p>
        <div className="mt-4">
          <MindsetBarChart percentages={results.mindset_percentages} />
        </div>
      </div>
    </section>
  );
}

function PersonalityLayerSection({
  results,
  profile,
}: {
  results: QscResults;
  profile: QscProfile | null;
}) {
  const primaryPersonalityLabel =
    PERSONALITY_LABELS[results.primary_personality];

  const howToCommunicate = normalizeField(
    profile?.how_to_communicate,
    "You respond best to communication that is clear, direct and grounded in real outcomes. You appreciate when people respect your time, come prepared, and show that they understand your priorities."
  );

  const saleBlockers = normalizeField(
    profile?.sale_blockers,
    "You tend to disengage when conversations become vague, overly complex, or when it feels like your current reality is not being understood."
  );

  return (
    <section className="mt-8 rounded-3xl border border-slate-200/80 bg-white/95 px-6 py-7 md:px-8 md:py-8 shadow-[0_18px_55px_rgba(15,23,42,0.45)] space-y-6">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
          Personality Layer
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">
          How you show up emotionally &amp; behaviourally
        </h2>
        <p className="text-sm text-slate-700 max-w-3xl">
          Your Personality Layer describes how you naturally think, act, and
          make decisions — before strategy, tools or trends enter the room.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3 text-xs text-slate-700">
        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-4 md:px-5 md:py-5">
          <h3 className="text-sm font-semibold text-slate-900">
            Core pattern ({primaryPersonalityLabel})
          </h3>
          <p className="mt-2">
            This is your default operating mode — the way you naturally approach
            decisions, conflict, opportunity and risk.
          </p>
          <p className="mt-2 whitespace-pre-line">
            {normalizeField(
              profile?.offer_fit,
              "You are wired for momentum and meaningful results. You care less about perfection and more about whether something actually moves the needle."
            )}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-4 md:px-5 md:py-5">
          <h3 className="text-sm font-semibold text-slate-900">
            What energises you
          </h3>
          <p className="mt-2 whitespace-pre-line">
            {normalizeField(
              profile?.trust_signals,
              "Clear direction, visible progress, honest feedback and environments where decisions actually lead to change."
            )}
          </p>
          <h3 className="mt-4 text-sm font-semibold text-slate-900">
            What drains you
          </h3>
          <p className="mt-2 whitespace-pre-line">
            {normalizeField(
              profile?.business_challenges,
              "Endless rework, unclear expectations, inconsistent communication and being asked to carry responsibilities that do not match your strengths."
            )}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-4 md:px-5 md:py-5">
          <h3 className="text-sm font-semibold text-slate-900">
            Communication pattern
          </h3>
          <p className="mt-2 whitespace-pre-line">{howToCommunicate}</p>
          <h3 className="mt-4 text-sm font-semibold text-slate-900">
            Where you get stuck
          </h3>
          <p className="mt-2 whitespace-pre-line">{saleBlockers}</p>
        </div>
      </div>
    </section>
  );
}

function MindsetLayerSection({ results }: { results: QscResults }) {
  const primaryMindsetLabel = MINDSET_LABELS[results.primary_mindset];
  const level =
    results.primary_mindset === "ORIGIN"
      ? 1
      : results.primary_mindset === "MOMENTUM"
      ? 2
      : results.primary_mindset === "VECTOR"
      ? 3
      : results.primary_mindset === "ORBIT"
      ? 4
      : 5;

  const requirementFallback =
    "At this stage, your business needs a balance of stability and forward motion. You are being asked to make decisions that protect the foundations, while still creating space for growth.";

  return (
    <section className="mt-8 rounded-3xl border border-slate-200/80 bg-white/95 px-6 py-7 md:px-8 md:py-8 shadow-[0_18px_55px_rgba(15,23,42,0.45)] space-y-6">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
          Mindset Layer
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">
          Your current Quantum stage — and what it asks of you
        </h2>
        <p className="text-sm text-slate-700 max-w-3xl">
          Your Mindset Layer describes the reality your business is currently
          operating in. Each stage has different requirements — what worked at
          an earlier stage can now quietly block growth.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start">
        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-4 md:px-5 md:py-5 text-xs text-slate-700">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
            Your stage
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {primaryMindsetLabel} (Level {level})
          </p>
          <p className="mt-2 whitespace-pre-line">{requirementFallback}</p>
          <p className="mt-3 text-[11px] text-slate-500">
            The decisions you make at this stage determine whether you stabilise,
            stall, or accidentally slide back into earlier patterns.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-950/90 border border-slate-800 px-4 py-4 md:px-5 md:py-5 text-xs text-slate-100">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-400">
            How your energy is spread
          </p>
          <p className="mt-1 text-xs text-slate-300">
            You will always have some energy spread across multiple stages. The
            goal is not to force yourself into a perfect box, but to understand
            where your <span className="font-semibold">centre of gravity</span>{" "}
            is right now.
          </p>
          <div className="mt-3">
            <MindsetBarChart percentages={results.mindset_percentages} />
          </div>
        </div>
      </div>
    </section>
  );
}

function CombinedPatternSection({
  results,
  profile,
}: {
  results: QscResults;
  profile: QscProfile;
}) {
  const primaryPersonalityLabel =
    PERSONALITY_LABELS[results.primary_personality];
  const primaryMindsetLabel = MINDSET_LABELS[results.primary_mindset];

  const combinedLabel = profile.profile_label || results.combined_profile_code;

  const businessChallenges = normalizeField(
    profile.business_challenges,
    "At this combined pattern, your main risks sit between speed and structure: moving fast enough to create momentum, but slow enough to stabilise systems, cashflow and delivery."
  );
  const offerFit = normalizeField(
    profile.offer_fit,
    "You are best served by offers that respect your pace, give you strategic clarity, and plug directly into the systems you already have, rather than forcing a complete rebuild."
  );
  const saleBlockers = normalizeField(
    profile.sale_blockers,
    "You are most likely to hesitate when the path feels vague, overly complex or slow, or when it is unclear how this will actually shift results in the next 90–180 days."
  );

  return (
    <section className="mt-8 rounded-3xl border border-slate-200/80 bg-white/95 px-6 py-7 md:px-8 md:py-8 shadow-[0_18px_55px_rgba(15,23,42,0.45)] space-y-6">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
          Combined Pattern
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">
          {combinedLabel} — what happens when your personality meets your stage
        </h2>
        <p className="text-sm text-slate-700 max-w-3xl">
          This is where the real QSC magic lives. Your{" "}
          <span className="font-semibold">{primaryPersonalityLabel}</span>{" "}
          pattern and{" "}
          <span className="font-semibold">{primaryMindsetLabel}</span> stage
          combine into one strategic blueprint. It explains why certain patterns
          repeat, why some decisions feel easy and others feel heavy, and where
          your fastest growth is likely to come from.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-4 md:px-5 md:py-5">
          <h3 className="text-sm font-semibold text-slate-900">
            Strategic strengths
          </h3>
          <p className="mt-2 text-xs text-slate-700">
            As a <span className="font-semibold">{combinedLabel}</span>, you are
            at your best when you:
          </p>
          <ul className="mt-3 space-y-1.5 text-xs text-slate-700 list-disc list-inside">
            <li>
              Lean into your natural{" "}
              {primaryPersonalityLabel.toLowerCase()} energy to create movement
              and momentum.
            </li>
            <li>
              Make decisions that connect today&apos;s reality with the future
              you are building, instead of getting lost in extremes.
            </li>
            <li>
              Build systems, offers and relationships that amplify your strengths
              rather than trying to “fix” your wiring.
            </li>
          </ul>
          <p className="mt-3 text-[11px] text-slate-500">
            These strengths become exponential when they are pointed at the right
            projects and protected from distraction.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-4 md:px-5 md:py-5">
          <h3 className="text-sm font-semibold text-slate-900">
            Growth risks &amp; loops
          </h3>
          <p className="mt-2 text-xs text-slate-700">
            The same pattern that fuels your growth can also create your biggest
            friction if left unchecked:
          </p>
          <p className="mt-3 text-xs text-slate-700 whitespace-pre-line">
            {businessChallenges}
          </p>
          <p className="mt-3 text-[11px] text-slate-500">
            Most entrepreneurs don&apos;t get stuck because of lack of effort —
            they get stuck repeating a pattern that used to work at a previous
            stage.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-4 md:px-5 md:py-5">
          <h3 className="text-sm font-semibold text-slate-900">
            Your biggest lever
          </h3>
          <p className="mt-2 text-xs text-slate-700 whitespace-pre-line">
            {offerFit}
          </p>
          <p className="mt-3 text-xs text-slate-700 whitespace-pre-line">
            {saleBlockers}
          </p>
          <p className="mt-3 text-[11px] text-slate-500">
            In practice, this means your fastest progress often comes from
            simplifying how you buy, build and lead — not just adding more.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 border border-dashed border-slate-300 px-4 py-4 md:px-5 md:py-5">
        <h3 className="text-sm font-semibold text-slate-900">
          Reflection prompts for your Quantum pattern
        </h3>
        <ul className="mt-3 space-y-1.5 text-xs text-slate-700 list-disc list-inside">
          <li>Where am I moving faster than my systems can reliably support?</li>
          <li>
            Which decisions am I delaying that would actually create more ease or
            capacity?
          </li>
          <li>
            What do I keep trying to “handle myself” that really needs a system or
            a person?
          </li>
          <li>
            If I fully trusted this profile, what would I stop forcing, and what
            would I give myself permission to do more of?
          </li>
        </ul>
      </div>
    </section>
  );
}

function EmotionalAlignmentSection({ profile }: { profile: QscProfile }) {
  const stabilises = normalizeField(
    profile.emotional_alignment_stabilises,
    "The patterns that stabilise you emotionally usually sit around rhythm, clarity and a sense of forward movement that you can feel and track. You tend to feel most grounded when your calendar, offers and decisions line up with what actually matters to you."
  );

  const destabilises = normalizeField(
    profile.emotional_alignment_destabilises,
    "You are most likely to feel emotionally stretched when everything feels urgent, when there is no clear container for your energy, or when you are being pulled into roles that don’t match your natural strengths."
  );

  const patterns = normalizeField(
    profile.emotional_alignment_patterns,
    "Pay attention to how your energy shifts across a week or month: notice when you say yes too quickly, when you over-carry other people’s urgency, or when you numb out instead of deciding. These are usually signals that your systems and emotional bandwidth are out of sync."
  );

  return (
    <section className="mt-8 rounded-3xl border border-slate-200/80 bg-white/95 px-6 py-7 md:px-8 md:py-8 shadow-[0_18px_55px_rgba(15,23,42,0.45)] space-y-6">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-700">
          Emotional Alignment
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">
          How your nervous system and business rhythm interact
        </h2>
        <p className="text-sm text-slate-700 max-w-3xl">
          Strategy only works if your nervous system can actually carry it. This
          section looks at what tends to settle you, what tends to shake you, and
          the emotional patterns to keep an eye on as you grow.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-4 md:px-5 md:py-5 flex flex-col">
          <h3 className="text-sm font-semibold text-emerald-900">
            What stabilises you
          </h3>
          <p className="mt-2 text-xs text-slate-700 whitespace-pre-line flex-1">
            {stabilises}
          </p>
          <p className="mt-3 text-[11px] text-slate-500">
            The more you intentionally design your weeks around these stabilisers,
            the easier it becomes to make consistent decisions and hold your
            strategic direction.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-4 md:px-5 md:py-5 flex flex-col">
          <h3 className="text-sm font-semibold text-rose-900">
            What destabilises you
          </h3>
          <p className="mt-2 text-xs text-slate-700 whitespace-pre-line flex-1">
            {destabilises}
          </p>
          <p className="mt-3 text-[11px] text-slate-500">
            Notice how these show up in your calendar, client work and team
            dynamics. They are usually early warning signs that your current way
            of working is not sustainable.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-4 md:px-5 md:py-5 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-900">
            Patterns to watch
          </h3>
          <p className="mt-2 text-xs text-slate-700 whitespace-pre-line flex-1">
            {patterns}
          </p>
          <p className="mt-3 text-[11px] text-slate-500">
            Treat this as a practical checklist rather than something to judge
            yourself on. The goal is to notice sooner, adjust faster, and protect
            the emotional bandwidth you need to grow.
          </p>
        </div>
      </div>
    </section>
  );
}

function DecisionStyleSection({ profile }: { profile: QscProfile }) {
  const decision = normalizeField(
    profile.decision_style,
    "You tend to make decisions quickly based on instinct, clarity, and potential future outcomes. While this enables momentum, it can also mean skipping important details or moving before a system is ready."
  );

  const trustSignals = normalizeField(
    profile.trust_signals,
    "You are most convinced by clarity, confidence, speed, and leadership presence. You want simple steps, proof of momentum, and a clear explanation of why this works rather than long theory."
  );

  return (
    <section className="mt-8 rounded-3xl border border-slate-200/80 bg-white/95 px-6 py-7 md:px-8 md:py-8 shadow-[0_18px_55px_rgba(15,23,42,0.45)] space-y-6">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-700">
          Communication &amp; decision style
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">
          How you communicate, process information &amp; decide
        </h2>
        <p className="text-sm text-slate-700 max-w-3xl">
          Understanding your communication and decision style helps you create
          environments where you operate at your highest potential — with
          clarity, calm and forward movement.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-4 md:px-5 md:py-5 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-900">
            How you decide
          </h3>
          <p className="mt-2 text-xs text-slate-700 whitespace-pre-line flex-1">
            {decision}
          </p>
          <p className="mt-4 text-[11px] text-slate-500">
            This decision style is powerful when supported by rhythm, structure,
            and reliable information — but can backfire if you are forced to push
            decisions under pressure or ambiguity.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-4 md:px-5 md:py-5 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-900">
            What convinces you
          </h3>
          <p className="mt-2 text-xs text-slate-700 whitespace-pre-line flex-1">
            {trustSignals}
          </p>
          <p className="mt-4 text-[11px] text-slate-500">
            These signals shape how you learn, buy, build systems, and lead. The
            more aligned your environment is with these trust signals, the more
            confidently &amp; consistently you make decisions.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-4 md:px-5 md:py-5">
        <h3 className="text-sm font-semibold text-emerald-900">
          How to support yourself
        </h3>
        <ul className="mt-2 space-y-1.5 text-xs text-emerald-900/95 list-disc list-inside">
          <li>Use dashboards, not long reports.</li>
          <li>Keep meetings short and intentional.</li>
          <li>Use visual systems (boards, charts, quick overviews).</li>
          <li>Delegate operational detail wherever possible.</li>
          <li>Give yourself deadlines that reduce emotional pressure.</li>
        </ul>
      </div>
    </section>
  );
}

function StrategicPrioritiesSection({ profile }: { profile: QscProfile }) {
  const p1 = normalizeField(
    profile.priority_1,
    "Protect time and energy for the work that actually moves revenue, rather than filling your week with reactive tasks."
  );
  const p2 = normalizeField(
    profile.priority_2,
    "Stabilise your core offer and delivery so growth does not create chaos or burnout."
  );
  const p3 = normalizeField(
    profile.priority_3,
    "Align your support (team, tools or partners) to your real working style instead of forcing yourself into someone else’s systems."
  );

  return (
    <section className="mt-8 rounded-3xl border border-slate-200/80 bg-white/95 px-6 py-7 md:px-8 md:py-8 shadow-[0_18px_55px_rgba(15,23,42,0.45)] space-y-5">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">
          Strategic growth priorities (Next 90 days)
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">
          The three levers that shift everything faster
        </h2>
        <p className="text-sm text-slate-700 max-w-3xl">
          Based on your current Quantum Profile, these are the most leveraged
          actions you can focus on in the next 90 days. Treat them as anchors for
          your planning and decision-making.
        </p>
      </header>

      <ol className="space-y-3 text-xs text-slate-800 list-decimal list-inside">
        <li className="whitespace-pre-line">{p1}</li>
        <li className="whitespace-pre-line">{p2}</li>
        <li className="whitespace-pre-line">{p3}</li>
      </ol>

      <p className="pt-2 text-[11px] text-slate-500">
        You don&apos;t need to fix everything at once. If these three priorities
        are held consistently, the rest of your strategy becomes far easier to
        execute and sustain.
      </p>
    </section>
  );
}

/* ------------------- Main Page ------------------- */

export default function QscReportPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<QscResults | null>(null);
  const [profile, setProfile] = useState<QscProfile | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch(`/api/public/qsc/${token}/report`, {
          cache: "no-store",
        });
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(
            `Non-JSON response (${res.status}): ${text.slice(0, 200)}`
          );
        }
        const j: ApiResponse = await res.json();
        if (!res.ok || !j.ok) {
          throw new Error(
            (j as any)?.error || `HTTP ${res.status} when loading QSC report`
          );
        }

        if (!j.results) throw new Error("No QSC results found for this link.");

        if (!alive) return;
        setResults(j.results);
        setProfile(
          j.profile ?? {
            id: "",
            personality_code: "A",
            mindset_level: 1,
            profile_code: "",
            profile_label: j.results.combined_profile_code,
            how_to_communicate: null,
            decision_style: null,
            business_challenges: null,
            trust_signals: null,
            offer_fit: null,
            sale_blockers: null,
          }
        );
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-50">
        <main className="mx-auto max-w-4xl px-4 py-10">
          <p className="text-sm font-medium text-slate-200">
            Preparing your Quantum Source Code report…
          </p>
        </main>
      </div>
    );
  }

  if (err || !results || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-50">
        <main className="mx-auto max-w-4xl px-4 py-10 space-y-4">
          <h1 className="text-2xl font-semibold">Couldn&apos;t load report</h1>
          <p className="text-sm text-slate-300">
            Something went wrong while loading this Quantum Source Code report.
          </p>
          {err && (
            <pre className="mt-3 rounded-2xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-100 whitespace-pre-wrap">
              {err}
            </pre>
          )}
          <p className="text-xs text-slate-500">
            If this keeps happening, please send this link to support so we can
            help you debug.
          </p>
          <Link
            href="/"
            className="inline-flex mt-2 items-center rounded-xl border border-slate-600 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-50 hover:bg-slate-800"
          >
            Back to MindCanvas
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-50">
      <main className="mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-8">
        <IntroSection results={results} profile={profile} />
        <HowToUseSection />
        <OnePageSummarySection results={results} profile={profile} />
        <ChartsSection results={results} />
        <PersonaMatrix results={results} />
        <PersonalityLayerSection results={results} profile={profile} />
        <MindsetLayerSection results={results} />
        <CombinedPatternSection results={results} profile={profile} />
        <EmotionalAlignmentSection profile={profile} />
        <DecisionStyleSection profile={profile} />
        <StrategicPrioritiesSection profile={profile} />

        <footer className="pt-4 pb-6 text-[11px] text-slate-500">
          © {new Date().getFullYear()} MindCanvas — Profiletest.ai
        </footer>
      </main>
    </div>
  );
}
