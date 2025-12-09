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
  how_to_communicate: string | null;
  decision_style: string | null;
  business_challenges: string | null;
  trust_signals: string | null;
  offer_fit: string | null;
  sale_blockers: string | null;
};

type ExtendedRow = {
  personality_code: string;
  personality_label: string;
  mindset_label: string;
  mindset_level: number;
  profile_code: string;
  persona_label: string;
  personality_layer: string | null;
  mindset_layer: string | null;
  combined_quantum_pattern: string | null;
  how_to_communicate: string | null;
  how_they_make_decisions: string | null;
  core_business_problems: string | null;
  what_builds_trust: string | null;
  what_offer_ready_for: string | null;
  what_blocks_sale: string | null;
  pre_call_questions: string | null;
  micro_scripts: string | null;
  green_red_flags: string | null;
  real_life_example: string | null;
  final_summary: string | null;
};

type QscPayload = {
  results: QscResultsRow;
  profile: QscProfileRow | null;
  extended: ExtendedRow | null;
};

function sectionText(value: string | null | undefined, fallback: string) {
  const v = (value || "").trim();
  return v.length > 0 ? v : fallback;
}

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
          `/api/public/qsc/${encodeURIComponent(token)}/extended`,
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
          extended?: ExtendedRow | null;
        };

        if (!res.ok || j.ok === false) {
          throw new Error(j.error || `HTTP ${res.status}`);
        }

        if (alive && j.results) {
          setPayload({
            results: j.results,
            profile: j.profile ?? null,
            extended: j.extended ?? null,
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
  const extended = payload?.extended ?? null;

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
    extended?.persona_label ||
    profile?.profile_label ||
    result.combined_profile_code ||
    "Quantum profile";

  const backHref = tid
    ? `/qsc/${encodeURIComponent(token)}?tid=${encodeURIComponent(tid)}`
    : `/qsc/${encodeURIComponent(token)}`;

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
            {extended && (
              <span className="text-[11px] text-slate-500">
                Pattern:{" "}
                <span className="font-semibold text-slate-100">
                  {extended.personality_label} • {extended.mindset_label} (
                  {extended.profile_code})
                </span>
              </span>
            )}
          </div>
        </header>

        {/* PROFILE SNAPSHOT (optional summary card) */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 md:p-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/90">
            Profile summary
          </p>
          <h2 className="text-xl font-semibold text-slate-50">
            How to sell to this buyer
          </h2>
          <p className="text-sm text-slate-300 max-w-3xl">
            This page is for you as the{" "}
            <span className="font-semibold">test owner</span>. It gives you the
            core sales, messaging and offer-fit insights you need to convert
            this profile — without needing to read their entire Strategic Growth
            Report.
          </p>
        </section>

        {/* 1. PERSONALITY LAYER */}
        <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 md:p-8 space-y-3">
          <h2 className="text-lg font-semibold text-slate-50">
            1. Personality Layer
          </h2>
          <p className="mt-3 text-sm text-slate-100 whitespace-pre-line">
            {sectionText(
              extended?.personality_layer,
              "Personality layer details have not been defined yet."
            )}
          </p>
        </section>

        {/* 2. MINDSET LAYER */}
        <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 md:p-8 space-y-3">
          <h2 className="text-lg font-semibold text-slate-50">
            2. Mindset Layer
          </h2>
          <p className="mt-3 text-sm text-slate-100 whitespace-pre-line">
            {sectionText(
              extended?.mindset_layer,
              "Mindset layer details have not been defined yet."
            )}
          </p>
        </section>

        {/* 3. COMBINED QUANTUM PATTERN */}
        <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 md:p-8 space-y-3">
          <h2 className="text-lg font-semibold text-slate-50">
            3. Combined Quantum Pattern
          </h2>
          <p className="mt-3 text-sm text-slate-100 whitespace-pre-line">
            {sectionText(
              extended?.combined_quantum_pattern,
              "Combined Quantum pattern has not been defined yet."
            )}
          </p>
        </section>

        {/* 4. HOW TO COMMUNICATE */}
        <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 md:p-8 space-y-3">
          <h2 className="text-lg font-semibold text-slate-50">
            4. How to Communicate
          </h2>
          <p className="mt-3 text-sm text-slate-100 whitespace-pre-line">
            {sectionText(
              extended?.how_to_communicate,
              "No communication guidance is available yet."
            )}
          </p>
        </section>

        {/* 5. HOW THEY MAKE DECISIONS */}
        <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 md:p-8 space-y-3">
          <h2 className="text-lg font-semibold text-slate-50">
            5. How They Make Decisions
          </h2>
          <p className="mt-3 text-sm text-slate-100 whitespace-pre-line">
            {sectionText(
              extended?.how_they_make_decisions,
              "Decision style has not been defined yet."
            )}
          </p>
        </section>

        {/* 6. CORE BUSINESS PROBLEMS */}
        <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 md:p-8 space-y-3">
          <h2 className="text-lg font-semibold text-slate-50">
            6. Core Business Problems
          </h2>
          <p className="mt-3 text-sm text-slate-100 whitespace-pre-line">
            {sectionText(
              extended?.core_business_problems,
              "Core business problems have not been defined yet."
            )}
          </p>
        </section>

        {/* 7. WHAT BUILDS TRUST */}
        <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 md:p-8 space-y-3">
          <h2 className="text-lg font-semibold text-slate-50">
            7. What Builds Trust
          </h2>
          <p className="mt-3 text-sm text-slate-100 whitespace-pre-line">
            {sectionText(
              extended?.what_builds_trust,
              "Trust-building patterns have not been defined yet."
            )}
          </p>
        </section>

        {/* 8. WHAT OFFER THEY ARE READY FOR */}
        <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 md:p-8 space-y-3">
          <h2 className="text-lg font-semibold text-slate-50">
            8. What Offer They Are Ready For
          </h2>
          <p className="mt-3 text-sm text-slate-100 whitespace-pre-line">
            {sectionText(
              extended?.what_offer_ready_for,
              "Offer readiness has not been defined yet."
            )}
          </p>
        </section>

        {/* 9. WHAT BLOCKS THE SALE COMPLETELY */}
        <section className="rounded-3xl border border-rose-600/50 bg-gradient-to-br from-slate-950 via-slate-950 to-rose-950/40 p-6 md:p-8 space-y-3">
          <h2 className="text-lg font-semibold text-rose-100">
            9. What Blocks the Sale Completely
          </h2>
          <p className="mt-3 text-sm text-rose-50 whitespace-pre-line">
            {sectionText(
              extended?.what_blocks_sale,
              "Sale blockers have not been defined yet."
            )}
          </p>
        </section>

        {/* 10. PRE-CALL QUESTIONS */}
        <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 md:p-8 space-y-3">
          <h2 className="text-lg font-semibold text-slate-50">
            10. Pre-Call Questions
          </h2>
          <p className="mt-3 text-sm text-slate-100 whitespace-pre-line">
            {sectionText(
              extended?.pre_call_questions,
              "Pre-call questions have not been defined yet."
            )}
          </p>
        </section>

        {/* 11. MICRO SCRIPTS */}
        <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 md:p-8 space-y-3">
          <h2 className="text-lg font-semibold text-slate-50">
            11. Micro Scripts
          </h2>
          <p className="mt-3 text-sm text-slate-100 whitespace-pre-line">
            {sectionText(
              extended?.micro_scripts,
              "Micro scripts have not been defined yet."
            )}
          </p>
        </section>

        {/* 12. GREEN & RED FLAGS */}
        <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 md:p-8 space-y-3">
          <h2 className="text-lg font-semibold text-slate-50">
            12. Green & Red Flags
          </h2>
          <p className="mt-3 text-sm text-slate-100 whitespace-pre-line">
            {sectionText(
              extended?.green_red_flags,
              "Green and red flags have not been defined yet."
            )}
          </p>
        </section>

        {/* 13. REAL-LIFE EXAMPLE */}
        <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 md:p-8 space-y-3">
          <h2 className="text-lg font-semibold text-slate-50">
            13. Real-Life Example
          </h2>
          <p className="mt-3 text-sm text-slate-100 whitespace-pre-line">
            {sectionText(
              extended?.real_life_example,
              "Real-life example has not been defined yet."
            )}
          </p>
        </section>

        {/* 14. FINAL SUMMARY */}
        <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 md:p-8 space-y-3">
          <h2 className="text-lg font-semibold text-slate-50">
            14. Final Summary
          </h2>
          <p className="mt-3 text-sm text-slate-100 whitespace-pre-line">
            {sectionText(
              extended?.final_summary,
              "Final summary has not been defined yet."
            )}
          </p>
        </section>

        <footer className="pt-4 pb-6 text-xs text-slate-500">
          © {new Date().getFullYear()} MindCanvas — Profiletest.ai
        </footer>
      </main>
    </div>
  );
}

