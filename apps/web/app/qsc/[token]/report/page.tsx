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
      <div className="min-h-screen relative text-slate-50">
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
      <div className="min-h-screen relative text-slate-50">
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
          <pre className="mt-2 rounded-xl border border-slate-800 bg-slate-950/90 p-3 text-xs text-slate-100 whitespace-pre-wrap">
            {err || "No data"}
          </pre>
        </main>
      </div>
    );
  }

  const createdAt = new Date(result.created_at);
  const personaName =
    persona?.profile_label || profile?.profile_label || "Your Quantum Profile";

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

  return (
    <div className="min-h-screen relative text-slate-50">
      <BackgroundGrid />

      <main className="relative mx-auto max-w-5xl px-4 py-10 md:py-12 space-y-10">
        {/* HEADER */}
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
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
              className="inline-flex items-center rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-1.5 text-xs font-medium hover:bg-slate-800"
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
        <section className="rounded-3xl bg-slate-900/80 border border-slate-700 p-6 md:p-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/90">
            Quantum profile
          </p>
          <h2 className="text-2xl font-semibold">{personaName}</h2>
          <p className="text-sm text-slate-200 max-w-3xl">
            This report gives you a clear understanding of who you are, how you
            work, and what your business needs next. It is designed to be
            simple, practical, and focused on helping you take confident action.
          </p>

          <div className="grid gap-6 md:grid-cols-2 pt-4 border-t border-slate-700/70">
            <div>
              <h3 className="text-sm font-semibold mb-1">
                Your Personality Layer
              </h3>
              <p className="text-sm text-slate-200">
                How you naturally think, act and make decisions. This is your
                emotional wiring and energetic pattern — it doesn&apos;t change
                overnight, which is why it&apos;s such a powerful anchor.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-1">
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
        <section className="rounded-3xl bg-slate-900/80 border border-slate-700 p-6 md:p-8 space-y-4">
          <h2 className="text-xl font-semibold">How to use this report</h2>
          <p className="text-sm text-slate-200">
            This is your personal strategic growth guide — not a personality
            box. Move through it slowly and come back often.
          </p>
          <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-200">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Start with the Profile Summary to understand your core pattern.
              </li>
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
        <section className="rounded-3xl bg-[#4a3b34] border border-amber-500/40 p-6 md:p-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-amber-200">
            One-page Quantum Summary
          </p>
          <h2 className="text-xl font-semibold">
            Your at-a-glance Quantum Profile
          </h2>
          <p className="text-sm text-amber-50/90">
            This is the snapshot you can keep open while planning your quarter,
            designing offers, or making big decisions.
          </p>

          <div className="grid gap-6 md:grid-cols-3 pt-4">
            <div className="rounded-2xl bg-[#2b211d] border border-amber-500/40 p-4 text-sm space-y-2 text-amber-50/95">
              <h3 className="font-semibold">Quantum Profile</h3>
              <p className="font-medium">{personaName}</p>
              <p className="">
                Personality: {primaryPersonalityLabel}.
                <br />
                Mindset Stage: {primaryMindsetLabel}.
              </p>
            </div>
            <div className="rounded-2xl bg-[#2b211d] border border-amber-500/40 p-4 text-sm space-y-2 text-amber-50/95">
              <h3 className="font-semibold">Strengths</h3>
              <p>
                [todo: best offer fit / strengths copy per profile]
              </p>
              <h4 className="mt-2 font-semibold">Risks</h4>
              <p>[todo: core business challenges for this pattern]</p>
            </div>
            <div className="rounded-2xl bg-[#2b211d] border border-amber-500/40 p-4 text-sm space-y-2 text-amber-50/95">
              <h3 className="font-semibold">Top strategic priorities</h3>
              <p>
                Use the three Strategic Growth Priorities at the end of this
                report as your 90-day focus.
              </p>
            </div>
          </div>
        </section>

        {/* FREQUENCY + MINDSET + MATRIX */}
        <section className="grid gap-6 md:grid-cols-2 items-start">
          {/* Buyer Frequency Type */}
          <div className="rounded-3xl bg-slate-950/80 text-slate-50 border border-slate-700 p-6 md:p-7 space-y-4">
            <h2 className="text-lg font-semibold">Buyer Frequency Type</h2>
            <p className="text-sm text-slate-300">
              Your emotional & energetic style across Fire, Flow, Form and Field.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
              {(["FIRE", "FLOW", "FORM", "FIELD"] as PersonalityKey[]).map(
                (key) => {
                  const raw = personalityTotals[key] ?? 0;
                  // Handle both decimals (0–1) and percentages (0–100)
                  const pct = raw > 1 ? raw : raw * 100;

                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between"
                    >
                      <span>{PERSONALITY_LABELS[key]}</span>
                      <span className="tabular-nums">
                        {Math.round(pct)}%
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* Buyer Mindset Levels */}
          <div className="rounded-3xl bg-slate-950/80 text-slate-50 border border-slate-700 p-6 md:p-7 space-y-4">
            <h2 className="text-lg font-semibold">Buyer Mindset Levels</h2>
            <p className="text-sm text-slate-300">
              How your energy is distributed across the 5 Quantum stages.
            </p>

            <div className="space-y-2 pt-2 text-xs">
              {(
                ["ORIGIN", "MOMENTUM", "VECTOR", "ORBIT", "QUANTUM"] as MindsetKey[]
              ).map((key) => {
                const raw = mindsetTotals[key] ?? 0;
                // Handle both decimals (0–1) and percentages (0–100)
                const pct = raw > 1 ? raw : raw * 100;
                const clamped = Math.min(100, Math.max(0, pct));

                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between">
                      <span>{MINDSET_LABELS[key]}</span>
                      <span className="tabular-nums">
                        {Math.round(pct)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-900">
                      <div
                        className="h-2 rounded-full bg-emerald-400"
                        style={{ width: `${clamped}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Buyer Persona Matrix */}
        <section className="rounded-3xl bg-slate-900/80 border border-slate-700 p-6 md:p-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
            Buyer Persona Matrix
          </p>
          <h2 className="text-xl font-semibold">
            Where your buyer frequency meets your mindset level
          </h2>
          <p className="text-sm text-slate-200">
            Each cell represents a different Quantum buyer persona. Your primary
            pattern is highlighted — this is where your emotional wiring and
            current business stage meet.
          </p>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-700 bg-slate-950/80">
            <QscMatrix
              primaryPersonality={result.primary_personality}
              primaryMindset={result.primary_mindset}
            />
          </div>
        </section>

        {/* PERSONALITY LAYER */}
        <section className="rounded-3xl bg-slate-900/80 border border-slate-700 p-6 md:p-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-indigo-300">
            Personality layer
          </p>
          <h2 className="text-xl font-semibold">
            How you show up emotionally & behaviourally
          </h2>
          <p className="text-sm text-slate-200">
            Your Personality Layer describes how you naturally think, act, and
            make decisions — before strategy, tools or trends enter the room.
          </p>

          <div className="grid gap-6 md:grid-cols-3 pt-2 text-sm">
            <div className="rounded-2xl bg-slate-950/80 border border-slate-700 p-4">
              <h3 className="font-semibold">
                Core pattern ({primaryPersonalityLabel})
              </h3>
              <p className="mt-1 text-slate-200">
                [todo: core emotional pattern + offer fit for this personality]
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950/80 border border-slate-700 p-4">
              <h3 className="font-semibold">What energises you</h3>
              <p className="mt-1 text-slate-200">
                {persona?.energisers ||
                  "[todo: energisers / trust signals for this pattern]"}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950/80 border border-slate-700 p-4">
              <h3 className="font-semibold">What drains you</h3>
              <p className="mt-1 text-slate-200">
                {persona?.drains ||
                  "[todo: typical drains / risks for this pattern]"}
              </p>
            </div>
          </div>
        </section>

        {/* MINDSET LAYER */}
        <section className="rounded-3xl bg-slate-900/80 border border-slate-700 p-6 md:p-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-emerald-300">
            Mindset layer
          </p>
          <h2 className="text-xl font-semibold">
            Your current Quantum stage — and what it asks of you
          </h2>
          <p className="text-sm text-slate-200">
            Your Mindset Layer describes the reality your business is currently
            operating in. Each stage has different requirements — what worked at
            an earlier stage can now quietly block growth.
          </p>

          <div className="grid gap-6 md:grid-cols-2 pt-2 text-sm">
            <div className="rounded-2xl bg-slate-950/80 border border-slate-700 p-4">
              <h3 className="font-semibold">Your stage</h3>
              <p className="mt-1 text-slate-200">{primaryMindsetLabel}</p>
              <p className="mt-2 text-slate-200">
                [todo: narrative description of this mindset stage]
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950/80 border border-slate-700 p-4">
              <h3 className="font-semibold">How your energy is spread</h3>
              <p className="mt-1 text-slate-200">
                You&apos;ll always have some energy spread across multiple
                stages. The goal is not to force yourself into a perfect box,
                but to understand where your centre of gravity is right now.
              </p>
            </div>
          </div>
        </section>

        {/* COMBINED PATTERN */}
        <section className="rounded-3xl bg-slate-900/80 border border-slate-700 p-6 md:p-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-rose-300">
            Combined pattern
          </p>
          <h2 className="text-xl font-semibold">
            {personaName} — what happens when your personality meets your stage
          </h2>
          <p className="text-sm text-slate-200">
            This is where the real QSC magic lives. Your personality pattern and
            Quantum stage combine into one strategic blueprint.
          </p>

          <div className="grid gap-6 md:grid-cols-3 pt-2 text-sm">
            <div className="rounded-2xl bg-slate-950/80 border border-slate-700 p-4">
              <h3 className="font-semibold">Strategic strengths</h3>
              <p className="mt-1 text-slate-200">
                [todo: strengths for this combined pattern]
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950/80 border border-slate-700 p-4">
              <h3 className="font-semibold">Growth risks & loops</h3>
              <p className="mt-1 text-slate-200">
                [todo: core business challenges / loops]
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950/80 border border-slate-700 p-4">
              <h3 className="font-semibold">Your biggest lever</h3>
              <p className="mt-1 text-slate-200">
                [todo: biggest lever + offer fit]
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-slate-600 bg-slate-950/80 p-4 text-sm">
            <h3 className="font-semibold mb-2">
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
        <section className="rounded-3xl bg-slate-900/80 border border-slate-700 p-6 md:p-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-orange-300">
            Strategic growth priorities (next 90 days)
          </p>
          <h2 className="text-xl font-semibold">
            The three levers that shift everything faster
          </h2>
          <p className="text-sm text-slate-200">
            Based on your current Quantum Profile, these are the most leveraged
            actions you can focus on in the next 90 days.
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-200">
            <li>
              Protect time and energy for the work that actually moves revenue,
              rather than filling your week with reactive tasks.
            </li>
            <li>
              Stabilise your core offer and delivery so growth does not create
              chaos or burnout.
            </li>
            <li>
              Align your support and tools around the way you actually work,
              instead of forcing yourself into someone else&apos;s system.
            </li>
          </ol>
        </section>

        <footer className="pt-4 pb-6 text-xs text-slate-500">
          © {new Date().getFullYear()} MindCanvas — Profiletest.ai
        </footer>
      </main>
    </div>
  );
}


