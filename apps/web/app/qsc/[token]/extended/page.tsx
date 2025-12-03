"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type PersonalityKey = "FIRE" | "FLOW" | "FORM" | "FIELD";
type MindsetKey = "ORIGIN" | "MOMENTUM" | "VECTOR" | "ORBIT" | "QUANTUM";

type QscResultsRow = {
  id: string;
  test_id: string;
  token: string;
  personality_totals: Record<string, number> | null;
  personality_percentages: Partial<Record<PersonalityKey, number>> | null;
  mindset_totals: Record<string, number> | null;
  mindset_percentages: Partial<Record<MindsetKey, number>> | null;
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

  // Extended Source Code – core sales/messaging blocks
  how_to_communicate: string | null;
  decision_style: string | null;
  business_challenges: string | null;
  trust_signals: string | null;
  offer_fit: string | null;
  sale_blockers: string | null;

  // NEW: full internal extended code (matches the client report)
  full_internal_insights: string | null;
};

type QscPayload = {
  results: QscResultsRow;
  profile: QscProfileRow | null;
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

export default function QscExtendedSourceCodePage({
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
        };

        if (!res.ok || j.ok === false) {
          throw new Error(j.error || `HTTP ${res.status}`);
        }

        if (alive && j.results) {
          setPayload({
            results: j.results,
            profile: j.profile ?? null,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <main className="mx-auto max-w-5xl px-4 py-12 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
            Quantum Source Code
          </p>
          <h1 className="mt-3 text-3xl font-bold">
            Preparing Extended Source Code…
          </h1>
        </main>
      </div>
    );
  }

  if (err || !result) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <main className="mx-auto max-w-5xl px-4 py-12 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
            Quantum Source Code
          </p>
          <h1 className="text-3xl font-bold">Couldn&apos;t load insights</h1>
          <p className="text-sm text-slate-300">
            We weren&apos;t able to load the Extended Source Code internal
            insights for this profile.
          </p>
          <pre className="mt-2 rounded-xl border border-slate-800 bg-slate-950/90 p-3 text-xs text-slate-100 whitespace-pre-wrap">
            {err || "No data"}
          </pre>
        </main>
      </div>
    );
  }

  const createdAt = new Date(result.created_at);

  const personaLabel =
    profile?.profile_label || result.combined_profile_code || "Quantum profile";

  const backHref = tid
    ? `/qsc/${encodeURIComponent(token)}?tid=${encodeURIComponent(tid)}`
    : `/qsc/${encodeURIComponent(token)}`;

  const howToCommunicate =
    profile?.how_to_communicate || "No communication guidance is available yet.";
  const decisionStyle =
    profile?.decision_style || "No decision style has been defined yet.";
  const businessChallenges =
    profile?.business_challenges ||
    "Core business challenges have not been defined yet.";
  const trustSignals =
    profile?.trust_signals || "Trust signals are not yet defined.";
  const offerFit =
    profile?.offer_fit || "Offer fit guidance has not been defined yet.";
  const saleBlockers =
    profile?.sale_blockers || "Sale blockers are not yet defined.";

  const fullInsights =
    profile?.full_internal_insights &&
    profile.full_internal_insights.trim().length > 0
      ? profile.full_internal_insights
      : null;

  const primaryPersonalityLabel =
    result.primary_personality &&
    PERSONALITY_LABELS[result.primary_personality];
  const primaryMindsetLabel =
    result.primary_mindset && MINDSET_LABELS[result.primary_mindset];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <main className="mx-auto max-w-5xl px-4 py-10 md:py-12 space-y-10">
        {/* HEADER */}
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
              Quantum Source Code
            </p>
            <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
              Extended Source Code — Internal Insights
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-2xl">
              Deep sales and messaging insights for this Quantum buyer profile.
              Use this as your reference when writing sales pages, email
              sequences, and live launch scripts.
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
              Snapshot created{" "}
              {createdAt.toLocaleString(undefined, {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="text-[11px] text-slate-500">
              Profile:{" "}
              <span className="font-semibold text-slate-100">
                {personaLabel}
              </span>
            </span>
          </div>
        </header>

        {/* PROFILE SUMMARY CARD */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 md:p-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/90">
            Profile summary
          </p>
          <h2 className="text-xl font-semibold text-slate-50">
            How to sell to this Quantum buyer
          </h2>
          <p className="text-sm text-slate-300 max-w-3xl">
            This page is for you as the{" "}
            <span className="font-semibold">test owner</span>. It gives you the
            core sales, messaging and offer-fit insights you need to convert
            this profile — without needing to read their entire Strategic Growth
            Report.
          </p>

          <dl className="mt-4 grid gap-y-1 text-sm text-slate-200">
            <div className="flex gap-2">
              <dt className="font-semibold">Quantum Profile:</dt>
              <dd>{personaLabel}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-semibold">Personality:</dt>
              <dd>{primaryPersonalityLabel || result.primary_personality || "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-semibold">Mindset stage:</dt>
              <dd>{primaryMindsetLabel || result.primary_mindset || "—"}</dd>
            </div>
          </dl>
        </section>

        {/* 1. HOW TO COMMUNICATE */}
        <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 md:p-8 space-y-3">
          <h2 className="text-lg font-semibold text-slate-50">
            1. How to communicate with this profile
          </h2>
          <p className="text-sm text-slate-300">
            Tone, pace, level of detail and delivery format that helps this
            buyer feel understood and safe.
          </p>
          <p className="mt-3 text-sm text-slate-100 whitespace-pre-line">
            {howToCommunicate}
          </p>
        </section>

        {/* 2. HOW THEY MAKE DECISIONS */}
        <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 md:p-8 space-y-3">
          <h2 className="text-lg font-semibold text-slate-50">
            2. How they make decisions
          </h2>
          <p className="text-sm text-slate-300">
            Whether they move fast or slow, lean emotional or logical, and
            whether they tend to decide alone or in collaboration.
          </p>
          <p className="mt-3 text-sm text-slate-100 whitespace-pre-line">
            {decisionStyle}
          </p>
        </section>

        {/* 3. CORE BUSINESS CHALLENGES */}
        <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 md:p-8 space-y-3">
          <h2 className="text-lg font-semibold text-slate-50">
            3. Their core business challenges
          </h2>
          <p className="text-sm text-slate-300">
            The patterns and friction points that show up most often for this
            buyer, based on their Personality and Mindset layers combined.
          </p>
          <p className="mt-3 text-sm text-slate-100 whitespace-pre-line">
            {businessChallenges}
          </p>
        </section>

        {/* 4. WHAT THEY NEED TO FEEL SAFE BUYING */}
        <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 md:p-8 space-y-3">
          <h2 className="text-lg font-semibold text-slate-50">
            4. What they need to feel safe buying
          </h2>
          <p className="text-sm text-slate-300">
            Trust signals, proof, emotional safety and strategic reassurance
            that reduces risk in their mind.
          </p>
          <p className="mt-3 text-sm text-slate-100 whitespace-pre-line">
            {trustSignals}
          </p>
        </section>

        {/* 5. BEST OFFER FIT */}
        <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 md:p-8 space-y-3">
          <h2 className="text-lg font-semibold text-slate-50">
            5. What offer type fits them best
          </h2>
          <p className="text-sm text-slate-300">
            The pricing, structure and level of support most likely to help them
            say yes and get results.
          </p>
          <p className="mt-3 text-sm text-slate-100 whitespace-pre-line">
            {offerFit}
          </p>
        </section>

        {/* 6. WHAT WILL BLOCK THE SALE */}
        <section className="rounded-3xl border border-rose-600/50 bg-gradient-to-br from-slate-950 via-slate-950 to-rose-950/40 p-6 md:p-8 space-y-3">
          <h2 className="text-lg font-semibold text-rose-100">
            6. What will block the sale
          </h2>
          <p className="text-sm text-rose-100/80">
            The fear triggers, objections, misalignments and risk perceptions
            that most often stop this buyer from moving ahead.
          </p>
          <p className="mt-3 text-sm text-rose-50 whitespace-pre-line">
            {saleBlockers}
          </p>
        </section>

        {/* 7. FULL EXTENDED SOURCE CODE (matches your doc) */}
        {fullInsights && (
          <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 md:p-8 space-y-3">
            <h2 className="text-lg font-semibold text-slate-50">
              Full Extended Source Code for this profile
            </h2>
            <p className="text-sm text-slate-300">
              This is the full internal insight block for this Quantum buyer
              profile, matching the Extended Source Code section of your client
              report. Use it as your deep reference when writing campaigns or
              planning launches.
            </p>
            <p className="mt-3 text-sm text-slate-100 whitespace-pre-line">
              {fullInsights}
            </p>
          </section>
        )}

        <footer className="pt-4 pb-6 text-xs text-slate-500">
          © {new Date().getFullYear()} MindCanvas — Profiletest.ai
        </footer>
      </main>
    </div>
  );
}
