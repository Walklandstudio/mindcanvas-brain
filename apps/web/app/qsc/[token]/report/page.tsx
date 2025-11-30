"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QscMatrix } from "../../QscMatrix";

type PersonalityKey = "FIRE" | "FLOW" | "FORM" | "FIELD";
type MindsetKey = "ORIGIN" | "MOMENTUM" | "VECTOR" | "ORBIT" | "QUANTUM";

type PersonalityPercMap = Partial<Record<PersonalityKey, number>>;
type MindsetPercMap = Partial<Record<MindsetKey, number>>;

type QscResultsRow = {
  id: string;
  test_id: string;
  token: string;
  personality_totals: Record<string, number> | null;
  personality_percentages: PersonalityPercMap | null;
  mindset_totals: Record<string, number> | null;
  mindset_percentages: MindsetPercMap | null;
  primary_personality: PersonalityKey | null;
  secondary_personality: PersonalityKey | null;
  primary_mindset: MindsetKey | null;
  secondary_mindset: MindsetKey | null;
  combined_profile_code: string | null;
  qsc_profile_id: string | null;
  created_at: string;
};

type QscProfileRow = {
  id: string;
  personality_code: string | null;
  mindset_level: number | null;
  profile_code: string | null;
  profile_label: string | null;
  how_to_communicate: string | null;
  decision_style: string | null;
  business_challenges: string | null;
  trust_signals: string | null;
  offer_fit: string | null;
  sale_blockers: string | null;
};

type QscPersonaRow = {
  id: string;
  test_id: string;
  personality_code: string | null;
  mindset_level: number | null;
  profile_code: string | null;
  profile_label: string | null;

  // existing short fields
  show_up_summary: string | null;
  energisers: string | null;
  drains: string | null;
  communication_long: string | null;
  admired_for: string | null;
  stuck_points: string | null;

  // new extended-report fields
  one_page_strengths: string | null;
  one_page_risks: string | null;

  combined_strengths: string | null;
  combined_risks: string | null;
  combined_big_lever: string | null;

  emotional_stabilises: string | null;
  emotional_destabilises: string | null;
  emotional_patterns_to_watch: string | null;

  decision_style_long: string | null;
  support_yourself: string | null;

  strategic_priority_1: string | null;
  strategic_priority_2: string | null;
  strategic_priority_3: string | null;
};

type QscPayload = {
  results: QscResultsRow;
  profile: QscProfileRow | null;
  persona?: QscPersonaRow | null;
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

// normalise stored values that might be 0–1 OR 0–100
function toDisplayPercent(raw: number | undefined | null): number {
  if (raw == null || Number.isNaN(raw)) return 0;
  const n = Number(raw);
  if (n <= 0) return 0;
  const pct = n <= 1 ? n * 100 : n; // 0.48 -> 48, 48 -> 48
  return Math.round(Math.min(100, Math.max(0, pct)));
}

export default function QscEntrepreneurStrategicReportPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;
  const searchParams = useSearchParams();
  const tid = searchParams?.get("tid") ?? "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [payload, setPayload] = useState<QscPayload | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch(
          `/api/public/qsc/${encodeURIComponent(token)}/result`,
          { cache: "no-store" }
        );

        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(
            `Non-JSON response (${res.status}): ${text.slice(0, 200)}`
          );
        }

        const j = (await res.json()) as {
          ok?: boolean;
          error?: string;
          results?: QscResultsRow;
          profile?: QscProfileRow | null;
          persona?: QscPersonaRow | null;
        };

        if (!res.ok || j.ok === false) {
          throw new Error(j.error || `HTTP ${res.status}`);
        }

        if (alive && j.results) {
          setPayload({
            results: j.results,
            profile: j.profile ?? null,
            persona: j.persona ?? null,
          });
        }
      } catch (e: any) {
        if (alive) setErr(String(e?.message || e || "Unknown error"));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  const result = payload?.results ?? null;
  const profile = payload?.profile ?? null;
  const persona = payload?.persona ?? null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <main className="mx-auto max-w-6xl px-4 py-12 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-400">
            Strategic Growth Report
          </p>
          <h1 className="mt-3 text-3xl font-bold">
            Preparing your QSC Entrepreneur report…
          </h1>
        </main>
      </div>
    );
  }

  if (err || !result) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <main className="mx-auto max-w-6xl px-4 py-12 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-400">
            Strategic Growth Report
          </p>
          <h1 className="text-3xl font-bold">Couldn&apos;t load report</h1>
          <p className="text-sm text-slate-300">
            We weren&apos;t able to generate your QSC Entrepreneur — Strategic
            Growth Report.
          </p>
          <pre className="mt-2 rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-100 whitespace-pre-wrap">
            {err || "No data"}
          </pre>
        </main>
      </div>
    );
  }

  const createdAt = new Date(result.created_at);
  const personaName =
    persona?.profile_label ||
    profile?.profile_label ||
    "Your Quantum Profile";

  const primaryPersonalityLabel =
    (result.primary_personality &&
      PERSONALITY_LABELS[result.primary_personality]) ||
    result.primary_personality ||
    "—";

  const primaryMindsetLabel =
    (result.primary_mindset && MINDSET_LABELS[result.primary_mindset]) ||
    result.primary_mindset ||
    "—";

  const backHref =
    tid && typeof window !== "undefined"
      ? `/qsc/${encodeURIComponent(token)}?tid=${encodeURIComponent(tid)}`
      : `/qsc/${encodeURIComponent(token)}`;

  const personalityPercentages = result.personality_percentages || {};
  const mindsetPercentages = result.mindset_percentages || {};

  const frequencyEntries = (["FIRE", "FLOW", "FORM", "FIELD"] as PersonalityKey[])
    .map((key) => ({
      key,
      label: PERSONALITY_LABELS[key],
      pct: toDisplayPercent(personalityPercentages[key]),
    }))
    // hide all-zero patterns so it looks cleaner
    .filter((entry) => entry.pct > 0);

  const mindsetEntries = (
    ["ORIGIN", "MOMENTUM", "VECTOR", "ORBIT", "QUANTUM"] as MindsetKey[]
  )
    .map((key) => ({
      key,
      label: MINDSET_LABELS[key],
      pct: toDisplayPercent(mindsetPercentages[key]),
    }))
    .filter((entry) => entry.pct > 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <main className="mx-auto max-w-6xl px-4 py-10 md:py-12 space-y-10">
        {/* HEADER */}
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-400">
              Strategic Growth Report
            </p>
            <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-slate-50">
              QSC Entrepreneur — Strategic Growth Report
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-2xl">
              Your personal emotional, strategic and scaling blueprint – based
              on your Quantum buyer profile and current mindset stage.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-xs text-slate-400">
            <Link
              href={backHref}
              className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium hover:bg-slate-800"
            >
              ← Back to Snapshot
            </Link>
            <span>
              Created at{" "}
              {createdAt.toLocaleString(undefined, {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </header>

        {/* QUANTUM PROFILE HERO */}
        <section className="rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-400">
            Quantum profile
          </p>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2 max-w-3xl">
              <h2 className="text-2xl font-semibold text-slate-50">
                {personaName}
              </h2>
              <p className="text-sm text-slate-300">
                This report gives you a clear understanding of who you are, how
                you work, and what your business needs next. It is designed to
                be simple, practical, and focused on helping you take confident
                action.
              </p>
            </div>
            <div className="mt-2 w-full max-w-xs rounded-2xl bg-slate-950/80 border border-slate-800 p-4 text-xs text-slate-200">
              <h3 className="mb-2 text-[11px] font-semibold tracking-[0.25em] uppercase text-slate-400">
                What you&apos;ll see
              </h3>
              <ul className="space-y-1 list-disc pl-4">
                <li>Your Personality Layer (how you naturally act & decide)</li>
                <li>Your Mindset Layer (where your business is right now)</li>
                <li>Your combined Quantum Profile &amp; strategic priorities</li>
              </ul>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 pt-4 border-t border-slate-800">
            <div>
              <h3 className="text-sm font-semibold mb-1 text-slate-100">
                Your Personality Layer
              </h3>
              <p className="text-sm text-slate-300">
                How you naturally think, act and make decisions. This is your
                emotional wiring and energetic pattern — it doesn&apos;t change
                overnight, which is why it&apos;s such a powerful anchor.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-1 text-slate-100">
                Your Mindset Layer
              </h3>
              <p className="text-sm text-slate-300">
                Where your business is right now and what stage of growth
                you&apos;re in. These needs shift as you grow — which is why you
                can&apos;t keep scaling with yesterday&apos;s strategy.
              </p>
            </div>
          </div>
        </section>

        {/* HOW TO USE THIS REPORT */}
        <section className="rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">
            How to use this report
          </h2>
          <p className="text-sm text-slate-300">
            This is your personal strategic growth guide — not a personality
            box. Move through it slowly and come back often.
          </p>
          <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-300">
            <ul className="list-disc pl-5 space-y-1">
              <li>Start with the Profile Summary to understand your core pattern.</li>
              <li>
                Study the Personality Layer to see why you act, respond and
                decide the way you do.
              </li>
              <li>
                Read the Mindset Layer to understand what your business needs at
                this stage.
              </li>
              <li>
                Pay close attention to the Combined Pattern — this is where the
                real insight lives.
              </li>
            </ul>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Use the Strategic Priorities to decide what actually matters in
                the next 90 days.
              </li>
              <li>
                Use the Reflection Prompts to stay emotionally and
                strategically aligned.
              </li>
              <li>
                Keep the One Page Summary handy as your quick reference during
                the week.
              </li>
            </ul>
          </div>
        </section>

        {/* ONE-PAGE SUMMARY */}
        <section className="rounded-3xl bg-[#f5e6c9] text-slate-900 border border-amber-300 p-6 md:p-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-amber-700">
            One-page Quantum Summary
          </p>
          <h2 className="text-xl font-semibold">
            Your at-a-glance Quantum Profile
          </h2>
          <p className="text-sm text-slate-800">
            This is the snapshot you can keep open while planning your quarter,
            designing offers, or making big decisions.
          </p>

          <div className="grid gap-6 md:grid-cols-3 pt-4">
            <div className="rounded-2xl bg-white border border-amber-200 p-4 text-sm space-y-2">
              <h3 className="font-semibold">Quantum Profile</h3>
              <p className="font-medium">{personaName}</p>
              <p className="text-slate-700">
                Personality: {primaryPersonalityLabel}.
                <br />
                Mindset Stage: {primaryMindsetLabel}.
              </p>
            </div>
            <div className="rounded-2xl bg-white border border-amber-200 p-4 text-sm space-y-2">
              <h3 className="font-semibold">Strengths</h3>
              <p className="text-slate-700 whitespace-pre-line">
                {persona?.one_page_strengths ||
                  "This section will summarise your key strengths at a glance."}
              </p>
            </div>
            <div className="rounded-2xl bg-white border border-amber-200 p-4 text-sm space-y-2">
              <h3 className="font-semibold">Risks</h3>
              <p className="text-slate-700 whitespace-pre-line">
                {persona?.one_page_risks ||
                  "This section will highlight the main risks or pitfalls to watch for."}
              </p>
            </div>
          </div>
        </section>

        {/* FREQUENCY + MINDSET */}
        <section className="grid gap-6 md:grid-cols-2 items-start">
          {/* Buyer Frequency Type */}
          <div className="rounded-3xl bg-slate-900 text-slate-50 border border-slate-800 p-6 md:p-7 space-y-4">
            <h2 className="text-lg font-semibold">Buyer Frequency Type</h2>
            <p className="text-sm text-slate-300">
              Your emotional & energetic style across Fire, Flow, Form and Field.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
              {frequencyEntries.length === 0 && (
                <p className="col-span-2 text-xs text-slate-500">
                  Frequency data not available for this result.
                </p>
              )}
              {frequencyEntries.map((entry) => (
                <div
                  key={entry.key}
                  className="flex items-center justify-between"
                >
                  <span>{entry.label}</span>
                  <span className="tabular-nums">{entry.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Buyer Mindset Levels */}
          <div className="rounded-3xl bg-slate-900 text-slate-50 border border-slate-800 p-6 md:p-7 space-y-4">
            <h2 className="text-lg font-semibold">Buyer Mindset Levels</h2>
            <p className="text-sm text-slate-300">
              How your energy is distributed across the 5 Quantum stages.
            </p>

            <div className="space-y-2 pt-2 text-xs">
              {mindsetEntries.length === 0 && (
                <p className="text-slate-500">
                  Mindset distribution data not available for this result.
                </p>
              )}
              {mindsetEntries.map((entry) => (
                <div key={entry.key} className="space-y-1">
                  <div className="flex justify-between">
                    <span>{entry.label}</span>
                    <span className="tabular-nums">{entry.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-emerald-400"
                      style={{ width: `${entry.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Buyer Persona Matrix */}
        <section className="rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-400">
            Buyer Persona Matrix
          </p>
          <h2 className="text-xl font-semibold text-slate-50">
            Where your buyer frequency meets your mindset level
          </h2>
          <p className="text-sm text-slate-300">
            Each cell represents a different Quantum buyer persona. Your primary
            pattern is highlighted — this is where your emotional wiring and
            current business stage meet.
          </p>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
            <QscMatrix
              primaryPersonality={result.primary_personality}
              primaryMindset={result.primary_mindset}
            />
          </div>
        </section>

        {/* PERSONALITY LAYER */}
        <section className="rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-400">
            Personality layer
          </p>
          <h2 className="text-xl font-semibold text-slate-50">
            How you show up emotionally & behaviourally
          </h2>
          <p className="text-sm text-slate-300">
            Your Personality Layer describes how you naturally think, act, and
            make decisions — before strategy, tools or trends enter the room.
          </p>

          <div className="grid gap-6 md:grid-cols-3 pt-2 text-sm">
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
              <h3 className="font-semibold">
                Core pattern ({primaryPersonalityLabel})
              </h3>
              <p className="mt-1 text-slate-300 whitespace-pre-line">
                {persona?.combined_strengths ||
                  persona?.show_up_summary ||
                  "This is your default operating mode — the way you naturally approach decisions, conflict, opportunity and risk."}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
              <h3 className="font-semibold">What energises you</h3>
              <p className="mt-1 text-slate-300 whitespace-pre-line">
                {persona?.emotional_stabilises ||
                  persona?.energisers ||
                  "Add what energises you for this profile in qsc_personas.emotional_stabilises."}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
              <h3 className="font-semibold">What drains or destabilises you</h3>
              <p className="mt-1 text-slate-300 whitespace-pre-line">
                {persona?.emotional_destabilises ||
                  persona?.drains ||
                  "Add drains / emotional destabilisers for this profile in qsc_personas.emotional_destabilises."}
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)] pt-4 text-sm">
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
              <h3 className="font-semibold">Emotional patterns to watch</h3>
              <p className="mt-1 text-slate-300 whitespace-pre-line">
                {persona?.emotional_patterns_to_watch ||
                  "Add patterns to watch for this profile in qsc_personas.emotional_patterns_to_watch."}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
              <h3 className="font-semibold">How to support yourself</h3>
              <p className="mt-1 text-slate-300 whitespace-pre-line">
                {persona?.support_yourself ||
                  "Add self-support guidance for this profile in qsc_personas.support_yourself."}
              </p>
            </div>
          </div>
        </section>

        {/* MINDSET LAYER */}
        <section className="rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-emerald-400">
            Mindset layer
          </p>
          <h2 className="text-xl font-semibold text-slate-50">
            Your current Quantum stage — and what it asks of you
          </h2>
          <p className="text-sm text-slate-300">
            Your Mindset Layer describes the reality your business is currently
            operating in. Each stage has different requirements — what worked at
            an earlier stage can now quietly block growth.
          </p>

          <div className="grid gap-6 md:grid-cols-2 pt-2 text-sm">
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
              <h3 className="font-semibold">Your stage</h3>
              <p className="mt-1 text-slate-200">{primaryMindsetLabel}</p>
              <p className="mt-2 text-slate-300 whitespace-pre-line">
                {persona?.decision_style_long ||
                  "Add the long narrative copy for this mindset stage in qsc_personas.decision_style_long."}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
              <h3 className="font-semibold">How your energy is spread</h3>
              <p className="mt-1 text-slate-300">
                You&apos;ll always have some energy spread across multiple
                stages. The goal is not to force yourself into a perfect box,
                but to understand where your centre of gravity is right now.
              </p>
            </div>
          </div>
        </section>

        {/* COMBINED PATTERN */}
        <section className="rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-rose-400">
            Combined pattern
          </p>
          <h2 className="text-xl font-semibold text-slate-50">
            {personaName} — what happens when your personality meets your stage
          </h2>
          <p className="text-sm text-slate-300">
            This is where the real QSC magic lives. Your personality pattern and
            Quantum stage combine into one strategic blueprint.
          </p>

          <div className="grid gap-6 md:grid-cols-3 pt-2 text-sm">
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
              <h3 className="font-semibold">Strategic strengths</h3>
              <p className="mt-1 text-slate-300 whitespace-pre-line">
                {persona?.combined_strengths ||
                  "Add combined strategic strengths in qsc_personas.combined_strengths."}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
              <h3 className="font-semibold">Growth risks & loops</h3>
              <p className="mt-1 text-slate-300 whitespace-pre-line">
                {persona?.combined_risks ||
                  "Add combined growth risks / loops in qsc_personas.combined_risks."}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
              <h3 className="font-semibold">Your biggest lever</h3>
              <p className="mt-1 text-slate-300 whitespace-pre-line">
                {persona?.combined_big_lever ||
                  "Add the biggest strategic lever for this pattern in qsc_personas.combined_big_lever."}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-4 text-sm">
            <h3 className="font-semibold mb-2 text-slate-50">
              Reflection prompts for your Quantum pattern
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>Where am I moving faster than my systems can reliably support?</li>
              <li>
                Which decisions am I delaying that would actually create more
                ease or capacity?
              </li>
              <li>
                What do I keep trying to “handle myself” that really needs a
                system or a person?
              </li>
              <li>
                If I fully trusted this profile, what would I stop forcing, and
                what would I give myself permission to do more of?
              </li>
            </ul>
          </div>
        </section>

        {/* EMOTIONAL ALIGNMENT */}
        <section className="rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-red-400">
            Emotional alignment
          </p>
          <h2 className="text-xl font-semibold text-slate-50">
            How your nervous system and business rhythm interact
          </h2>
          <p className="text-sm text-slate-300">
            Strategy only works if your nervous system can actually carry it.
            This section looks at what tends to settle you, what tends to shake
            you, and the emotional patterns to keep an eye on as you grow.
          </p>

          <div className="grid gap-6 md:grid-cols-3 pt-2 text-sm">
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
              <h3 className="font-semibold">What stabilises you</h3>
              <p className="mt-1 text-slate-300 whitespace-pre-line">
                {persona?.emotional_stabilises ||
                  "Add what stabilises you in qsc_personas.emotional_stabilises."}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
              <h3 className="font-semibold">What destabilises you</h3>
              <p className="mt-1 text-slate-300 whitespace-pre-line">
                {persona?.emotional_destabilises ||
                  "Add what destabilises you in qsc_personas.emotional_destabilises."}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
              <h3 className="font-semibold">Patterns to watch</h3>
              <p className="mt-1 text-slate-300 whitespace-pre-line">
                {persona?.emotional_patterns_to_watch ||
                  "Add patterns to watch in qsc_personas.emotional_patterns_to_watch."}
              </p>
            </div>
          </div>
        </section>

        {/* COMMUNICATION & DECISION STYLE */}
        <section className="rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-indigo-400">
            Communication & decision style
          </p>
          <h2 className="text-xl font-semibold text-slate-50">
            How you communicate, process information & decide
          </h2>
          <p className="text-sm text-slate-300">
            Understanding your communication and decision style helps you create
            environments where you operate at your highest potential — with
            clarity, calm and forward movement.
          </p>

          <div className="grid gap-6 md:grid-cols-2 pt-2 text-sm">
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
              <h3 className="font-semibold">How you decide</h3>
              <p className="mt-1 text-slate-300 whitespace-pre-line">
                {persona?.decision_style_long ||
                  profile?.decision_style ||
                  "Add decision-style copy for this profile in qsc_personas.decision_style_long or qsc_profiles.decision_style."}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
              <h3 className="font-semibold">What convinces you</h3>
              <p className="mt-1 text-slate-300 whitespace-pre-line">
                {profile?.trust_signals ||
                  persona?.admired_for ||
                  "Add trust signals / what convinces you in qsc_profiles.trust_signals."}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-emerald-900/20 border border-emerald-500/60 p-4 mt-4 text-sm">
            <h3 className="font-semibold text-emerald-100">
              How to support yourself
            </h3>
            <p className="mt-1 text-emerald-50 whitespace-pre-line">
              {persona?.support_yourself ||
                "Add self-support guidance for this pattern in qsc_personas.support_yourself."}
            </p>
          </div>
        </section>

        {/* STRATEGIC PRIORITIES */}
        <section className="rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-orange-400">
            Strategic growth priorities (next 90 days)
          </p>
          <h2 className="text-xl font-semibold text-slate-50">
            The three levers that shift everything faster
          </h2>
          <p className="text-sm text-slate-300">
            Based on your current Quantum Profile, these are the most leveraged
            actions you can focus on in the next 90 days. Treat them as anchors
            for your planning and decision-making.
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-300">
            <li>
              {persona?.strategic_priority_1 ||
                "Add Strategic priority 1 for this profile in qsc_personas.strategic_priority_1."}
            </li>
            <li>
              {persona?.strategic_priority_2 ||
                "Add Strategic priority 2 for this profile in qsc_personas.strategic_priority_2."}
            </li>
            <li>
              {persona?.strategic_priority_3 ||
                "Add Strategic priority 3 for this profile in qsc_personas.strategic_priority_3."}
            </li>
          </ol>
          <p className="mt-3 text-xs text-slate-400">
            You don&apos;t need to fix everything at once. If these three
            priorities are held consistently, the rest of your strategy becomes
            far easier to execute and sustain.
          </p>
        </section>

        <footer className="pt-4 pb-6 text-xs text-slate-500">
          © {new Date().getFullYear()} MindCanvas — Profiletest.ai
        </footer>
      </main>
    </div>
  );
}
