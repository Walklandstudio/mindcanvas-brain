// apps/web/app/qsc/[token]/report/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QscMatrix } from "../../QscMatrix";
import BackgroundGrid from "@/components/ui/BackgroundGrid";

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

  show_up_summary: string | null;
  energisers: string | null;
  drains: string | null;
  communication_long: string | null;
  admired_for: string | null;
  stuck_points: string | null;

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
      <div className="relative min-h-screen text-slate-50">
        <BackgroundGrid />
        <main className="relative mx-auto max-w-5xl px-4 py-12 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
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
      <div className="relative min-h-screen text-slate-50">
        <BackgroundGrid />
        <main className="relative mx-auto max-w-5xl px-4 py-12 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
            Strategic Growth Report
          </p>
          <h1 className="text-3xl font-bold">Couldn&apos;t load report</h1>
          <p className="text-sm text-slate-200">
            We weren&apos;t able to generate your QSC Entrepreneur — Strategic
            Growth Report.
          </p>
          <pre className="mt-2 rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-xs text-slate-50 whitespace-pre-wrap">
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

  const personalityTotals = result.personality_percentages || {};
  const mindsetTotals = result.mindset_percentages || {};

  // Persona-derived fields with safe fallbacks
  const onePageStrengths =
    persona?.one_page_strengths ||
    persona?.show_up_summary ||
    "Your strengths for this pattern will appear here.";
  const onePageRisks =
    persona?.one_page_risks ||
    persona?.stuck_points ||
    "Your main risks and repeating loops will appear here.";

  const combinedStrengths =
    persona?.combined_strengths ||
    "Your core strategic strengths for this combined pattern will appear here.";
  const combinedRisks =
    persona?.combined_risks ||
    "Your key risks, loops or blind spots for this combined pattern will appear here.";
  const combinedBigLever =
    persona?.combined_big_lever ||
    "Your biggest strategic lever for this pattern will appear here.";

  const emotionalStabilises =
    persona?.emotional_stabilises ||
    "What helps you feel emotionally grounded will appear here.";
  const emotionalDestabilises =
    persona?.emotional_destabilises ||
    "What destabilises your emotions or decision-making will appear here.";
  const emotionalPatternsToWatch =
    persona?.emotional_patterns_to_watch ||
    "Key emotional patterns to keep an eye on will appear here.";

  const decisionStyleLong =
    persona?.decision_style_long || profile?.decision_style || null;
  const supportYourself =
    persona?.support_yourself ||
    "Your best ways to support yourself in this pattern will appear here.";

  const strategic1 =
    persona?.strategic_priority_1 ||
    "Clarify and protect time for the work that actually moves revenue.";
  const strategic2 =
    persona?.strategic_priority_2 ||
    "Stabilise your core offer and delivery so growth doesn’t create chaos.";
  const strategic3 =
    persona?.strategic_priority_3 ||
    "Align your systems and support with how you actually work best.";

  return (
    <div className="relative min-h-screen text-slate-50">
      <BackgroundGrid />
      <main className="relative mx-auto max-w-5xl px-4 py-10 md:py-12 space-y-10">
        {/* HEADER */}
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300">
              Strategic Growth Report
            </p>
            <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
              QSC Entrepreneur — Strategic Growth Report
            </h1>
            <p className="mt-2 text-sm text-slate-200 max-w-2xl">
              Your personal emotional, strategic and scaling blueprint – based
              on your Quantum buyer profile and current mindset stage.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-xs text-slate-300">
            <Link
              href={backHref}
              className="inline-flex items-center rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-1.5 text-xs font-medium hover:bg-slate-800"
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
        <section className="rounded-3xl bg-slate-950/80 border border-slate-700 p-6 md:p-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300">
            Quantum profile
          </p>
          <h2 className="text-2xl font-semibold text-slate-50">{personaName}</h2>
          <p className="text-sm text-slate-200 max-w-3xl">
            This report gives you a clear understanding of who you are, how you
            work, and what your business needs next. It is designed to be
            simple, practical, and focused on helping you take confident action.
          </p>

          <div className="grid gap-6 md:grid-cols-2 pt-4 border-t border-slate-800">
            <div>
              <h3 className="text-sm font-semibold mb-1 text-slate-50">
                Your Personality Layer
              </h3>
              <p className="text-sm text-slate-200">
                How you naturally think, act and make decisions. This is your
                emotional wiring and energetic pattern — it doesn&apos;t change
                overnight, which is why it&apos;s such a powerful anchor.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-1 text-slate-50">
                Your Mindset Layer
              </h3>
              <p className="text-sm text-slate-200">
                Where your business is right now and what stage of growth
                you&apos;re in. These needs shift as you grow — which is why you
                can&apos;t keep scaling with yesterday&apos;s strategy.
              </p>
            </div>
          </div>
        </section>

        {/* HOW TO USE THIS REPORT */}
        <section className="rounded-3xl bg-slate-950/70 border border-slate-700 p-6 md:p-8 space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">
            How to use this report
          </h2>
          <p className="text-sm text-slate-200">
            This is your personal strategic growth guide — not a personality
            box. Move through it slowly and come back often.
          </p>
          <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-200">
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
        <section className="rounded-3xl bg-[#f5eddc] text-slate-900 border border-amber-200 p-6 md:p-8 space-y-4">
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
            <div className="rounded-2xl bg-white/80 border border-amber-200 p-4 text-sm space-y-2">
              <h3 className="font-semibold">Quantum Profile</h3>
              <p className="font-medium">{personaName}</p>
              <p className="text-slate-700">
                Personality: {primaryPersonalityLabel}.
                <br />
                Mindset Stage: {primaryMindsetLabel}.
              </p>
            </div>
            <div className="rounded-2xl bg-white/80 border border-amber-200 p-4 text-sm space-y-2">
              <h3 className="font-semibold">Strengths</h3>
              <p className="text-slate-700 whitespace-pre-line">
                {onePageStrengths}
              </p>
              <h4 className="mt-2 font-semibold">Risks</h4>
              <p className="text-slate-700 whitespace-pre-line">
                {onePageRisks}
              </p>
            </div>
            <div className="rounded-2xl bg-white/80 border border-amber-200 p-4 text-sm space-y-2">
              <h3 className="font-semibold">Top strategic priorities</h3>
              <p className="text-slate-700">
                Use the three Strategic Growth Priorities at the end of this
                report as your 90-day focus.
              </p>
            </div>
          </div>
        </section>

        {/* FREQUENCY + MINDSET + MATRIX */}
        <section className="grid gap-6 md:grid-cols-2 items-start">
          {/* Buyer Frequency Type */}
          <div className="rounded-3xl bg-slate-950/85 text-slate-50 border border-slate-700 p-6 md:p-7 space-y-4">
            <h2 className="text-lg font-semibold">Buyer Frequency Type</h2>
            <p className="text-sm text-slate-300">
              Your emotional & energetic style across Fire, Flow, Form and Field.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
              {(["FIRE", "FLOW", "FORM", "FIELD"] as PersonalityKey[]).map(
                (key) => (
                  <div key={key} className="flex items-center justify-between">
                    <span>{PERSONALITY_LABELS[key]}</span>
                    <span className="tabular-nums">
                      {Math.round((personalityTotals[key] ?? 0) * 100)}%
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Buyer Mindset Levels */}
          <div className="rounded-3xl bg-slate-950/85 text-slate-50 border border-slate-700 p-6 md:p-7 space-y-4">
            <h2 className="text-lg font-semibold">Buyer Mindset Levels</h2>
            <p className="text-sm text-slate-300">
              How your energy is distributed across the 5 Quantum stages.
            </p>

            <div className="space-y-2 pt-2 text-xs">
              {(
                ["ORIGIN", "MOMENTUM", "VECTOR", "ORBIT", "QUANTUM"] as MindsetKey[]
              ).map((key) => {
                const pct = Math.round((mindsetTotals[key] ?? 0) * 100);
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between">
                      <span>{MINDSET_LABELS[key]}</span>
                      <span className="tabular-nums">{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-900">
                      <div
                        className="h-2 rounded-full bg-emerald-400"
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Buyer Persona Matrix */}
        <section className="rounded-3xl bg-slate-950/70 border border-slate-700 p-6 md:p-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300">
            Buyer Persona Matrix
          </p>
          <h2 className="text-xl font-semibold text-slate-50">
            Where your buyer frequency meets your mindset level
          </h2>
          <p className="text-sm text-slate-200">
            Each cell represents a different Quantum buyer persona. Your primary
            pattern is highlighted — this is where your emotional wiring and
            current business stage meet.
          </p>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-700 bg-slate-900/70">
            <QscMatrix
              primaryPersonality={result.primary_personality}
              primaryMindset={result.primary_mindset}
            />
          </div>
        </section>

        {/* PERSONALITY LAYER */}
        <section className="rounded-3xl bg-slate-950/75 border border-slate-700 p-6 md:p-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-indigo-300">
            Personality layer
          </p>
          <h2 className="text-xl font-semibold text-slate-50">
            How you show up emotionally & behaviourally
          </h2>
          <p className="text-sm text-slate-200">
            Your Personality Layer describes how you naturally think, act, and
            make decisions — before strategy, tools or trends enter the room.
          </p>

          <div className="grid gap-6 md:grid-cols-3 pt-2 text-sm">
            <div className="rounded-2xl bg-slate-900/70 border border-slate-700 p-4">
              <h3 className="font-semibold text-slate-50">
                Core pattern ({primaryPersonalityLabel})
              </h3>
              <p className="mt-1 text-slate-200 whitespace-pre-line">
                {persona?.show_up_summary ||
                  "Your core emotional and behavioural pattern will appear here."}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-900/70 border border-slate-700 p-4">
              <h3 className="font-semibold text-slate-50">What energises you</h3>
              <p className="mt-1 text-slate-200 whitespace-pre-line">
                {persona?.energisers ||
                  "What tends to energise and expand you in business will appear here."}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-900/70 border border-slate-700 p-4">
              <h3 className="font-semibold text-slate-50">What drains you</h3>
              <p className="mt-1 text-slate-200 whitespace-pre-line">
                {persona?.drains ||
                  "What tends to drain you or trigger shutdown will appear here."}
              </p>
            </div>
          </div>
        </section>

        {/* EMOTIONAL LAYER */}
        <section className="rounded-3xl bg-slate-950/75 border border-slate-700 p-6 md:p-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-rose-300">
            Emotional layer
          </p>
          <h2 className="text-xl font-semibold text-slate-50">
            What stabilises you — and what throws you off
          </h2>

          <div className="grid gap-6 md:grid-cols-3 pt-2 text-sm">
            <div className="rounded-2xl bg-slate-900/70 border border-slate-700 p-4">
              <h3 className="font-semibold text-slate-50">
                What stabilises you
              </h3>
              <p className="mt-1 text-slate-200 whitespace-pre-line">
                {emotionalStabilises}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-900/70 border border-slate-700 p-4">
              <h3 className="font-semibold text-slate-50">
                What destabilises you
              </h3>
              <p className="mt-1 text-slate-200 whitespace-pre-line">
                {emotionalDestabilises}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-900/70 border border-slate-700 p-4">
              <h3 className="font-semibold text-slate-50">
                Patterns to watch
              </h3>
              <p className="mt-1 text-slate-200 whitespace-pre-line">
                {emotionalPatternsToWatch}
              </p>
            </div>
          </div>
        </section>

        {/* MINDSET LAYER */}
        <section className="rounded-3xl bg-slate-950/75 border border-slate-700 p-6 md:p-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-emerald-300">
            Mindset layer
          </p>
          <h2 className="text-xl font-semibold text-slate-50">
            Your current Quantum stage — and what it asks of you
          </h2>
          <p className="text-sm text-slate-200">
            Your Mindset Layer describes the reality your business is currently
            operating in. Each stage has different requirements — what worked at
            an earlier stage can now quietly block growth.
          </p>

          <div className="grid gap-6 md:grid-cols-2 pt-2 text-sm">
            <div className="rounded-2xl bg-slate-900/70 border border-slate-700 p-4">
              <h3 className="font-semibold text-slate-50">Your stage</h3>
              <p className="mt-1 text-slate-200">{primaryMindsetLabel}</p>
              <p className="mt-2 text-slate-200 whitespace-pre-line">
                {decisionStyleLong ||
                  "A deeper description of how you tend to think and decide at this stage will appear here."}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-900/70 border border-slate-700 p-4">
              <h3 className="font-semibold text-slate-50">
                How to support yourself
              </h3>
              <p className="mt-1 text-slate-200 whitespace-pre-line">
                {supportYourself}
              </p>
            </div>
          </div>
        </section>

        {/* COMBINED PATTERN */}
        <section className="rounded-3xl bg-slate-950/75 border border-slate-700 p-6 md:p-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-orange-300">
            Combined pattern
          </p>
          <h2 className="text-xl font-semibold text-slate-50">
            {personaName} — what happens when your personality meets your stage
          </h2>
          <p className="text-sm text-slate-200">
            This is where the real QSC magic lives. Your personality pattern and
            Quantum stage combine into one strategic blueprint.
          </p>

          <div className="grid gap-6 md:grid-cols-3 pt-2 text-sm">
            <div className="rounded-2xl bg-slate-900/70 border border-slate-700 p-4">
              <h3 className="font-semibold text-slate-50">
                Strategic strengths
              </h3>
              <p className="mt-1 text-slate-200 whitespace-pre-line">
                {combinedStrengths}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-900/70 border border-slate-700 p-4">
              <h3 className="font-semibold text-slate-50">
                Growth risks & loops
              </h3>
              <p className="mt-1 text-slate-200 whitespace-pre-line">
                {combinedRisks}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-900/70 border border-slate-700 p-4">
              <h3 className="font-semibold text-slate-50">
                Your biggest lever
              </h3>
              <p className="mt-1 text-slate-200 whitespace-pre-line">
                {combinedBigLever}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-4 text-sm">
            <h3 className="font-semibold mb-2 text-slate-50">
              Reflection prompts for your Quantum pattern
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-200">
              <li>
                Where am I moving faster than my systems can reliably support?
              </li>
              <li>
                Which decisions am I delaying that would actually create more
                ease or capacity?
              </li>
              <li>
                What do I keep trying to “handle myself” that really needs a
                system or a person?
              </li>
            </ul>
          </div>
        </section>

        {/* STRATEGIC PRIORITIES */}
        <section className="rounded-3xl bg-slate-950/75 border border-slate-700 p-6 md:p-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-amber-300">
            Strategic growth priorities (next 90 days)
          </p>
          <h2 className="text-xl font-semibold text-slate-50">
            The three levers that shift everything faster
          </h2>
          <p className="text-sm text-slate-200">
            Based on your current Quantum Profile, these are the most leveraged
            actions you can focus on in the next 90 days.
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-200 whitespace-pre-line">
            <li>{strategic1}</li>
            <li>{strategic2}</li>
            <li>{strategic3}</li>
          </ol>
        </section>

        <footer className="pt-4 pb-6 text-xs text-slate-400">
          © {new Date().getFullYear()} MindCanvas — Profiletest.ai
        </footer>
      </main>
    </div>
  );
}

