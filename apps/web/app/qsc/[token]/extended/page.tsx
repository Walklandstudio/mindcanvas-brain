"use client";

import Link from "next/link";
import { useEffect, useState, ReactNode } from "react";
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

  // ✅ matches the Snapshot report payload shape
  taker: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
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

/**
 * Generic card for each numbered section.
 * Slightly larger, more “report-like” typography.
 */
function SectionCard({
  id,
  number,
  title,
  kicker,
  children,
  variant = "default",
}: {
  id: string;
  number: number;
  title: string;
  kicker?: string;
  children: ReactNode;
  variant?: "default" | "danger";
}) {
  const isDanger = variant === "danger";

  return (
    <section
      id={id}
      className={[
        "scroll-mt-28 rounded-3xl border p-6 md:p-8 space-y-3",
        isDanger
          ? "border-rose-600/50 bg-gradient-to-br from-slate-950 via-slate-950 to-rose-950/40"
          : "border-slate-800 bg-slate-950/80",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            isDanger
              ? "bg-rose-500/20 text-rose-100 border border-rose-400/60"
              : "bg-sky-500/15 text-sky-100 border border-sky-400/50",
          ].join(" ")}
        >
          {number}
        </div>
        <div className="space-y-1.5">
          <h2
            className={[
              "text-[1.05rem] md:text-[1.1rem] font-semibold",
              isDanger ? "text-rose-50" : "text-slate-50",
            ].join(" ")}
          >
            {title}
          </h2>
          {kicker && (
            <p
              className={[
                "text-sm md:text-[15px] leading-relaxed",
                isDanger ? "text-rose-100/80" : "text-slate-300",
              ].join(" ")}
            >
              {kicker}
            </p>
          )}
        </div>
      </div>
      <div
        className={[
          "pt-3 text-sm md:text-[15px] leading-relaxed whitespace-pre-line",
          isDanger ? "text-rose-50" : "text-slate-100",
        ].join(" ")}
      >
        {children}
      </div>
    </section>
  );
}

const SECTION_INDEX = [
  { id: "sec-1-personality", number: 1, title: "Personality Layer" },
  { id: "sec-2-mindset", number: 2, title: "Mindset Layer" },
  { id: "sec-3-quantum", number: 3, title: "Combined Quantum Pattern" },
  { id: "sec-4-communicate", number: 4, title: "How to Communicate" },
  { id: "sec-5-decisions", number: 5, title: "How They Make Decisions" },
  { id: "sec-6-problems", number: 6, title: "Core Business Problems" },
  { id: "sec-7-trust", number: 7, title: "What Builds Trust" },
  { id: "sec-8-offer", number: 8, title: "What Offer They Are Ready For" },
  { id: "sec-9-blockers", number: 9, title: "What Blocks the Sale" },
  { id: "sec-10-precall", number: 10, title: "Pre-Call Questions" },
  { id: "sec-11-microscripts", number: 11, title: "Micro Scripts" },
  { id: "sec-12-flags", number: 12, title: "Green & Red Flags" },
  { id: "sec-13-example", number: 13, title: "Real-Life Example" },
  { id: "sec-14-summary", number: 14, title: "Final Summary" },
];

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

  // ✅ now reads from the taker object (same as Snapshot page)
  const takerName = result?.taker?.name ?? null;

  const backHref = tid
    ? `/qsc/${encodeURIComponent(token)}?tid=${encodeURIComponent(tid)}`
    : `/qsc/${encodeURIComponent(token)}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <main className="mx-auto max-w-6xl px-4 py-10 md:py-12 space-y-10">
        {/* HEADER */}
        <header className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
              Quantum Source Code
            </p>
            <h1 className="text-[2.1rem] md:text-[2.4rem] font-bold tracking-tight">
              Extended Source Code — Internal Insights
            </h1>
            <p className="text-sm md:text-[15px] leading-relaxed text-slate-300 max-w-2xl">
              Deep sales and messaging insights for this Quantum buyer profile.
              Use this as your reference when designing offers, sales pages,
              email sequences, and live launch scripts.
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
            {takerName && (
              <span className="text-[11px] text-slate-500">
                Test-taker:{" "}
                <span className="font-semibold text-slate-100">
                  {takerName}
                </span>
              </span>
            )}
            <div className="flex flex-col items-end gap-0.5 text-[11px]">
              <span className="text-slate-500">
                Combined profile:{" "}
                <span className="font-semibold text-slate-100">
                  {personaLabel}
                </span>
              </span>
              {extended && (
                <span className="text-slate-500">
                  Pattern:{" "}
                  <span className="font-semibold text-slate-100">
                    {extended.personality_label} • {extended.mindset_label} (
                    {extended.profile_code})
                  </span>
                </span>
              )}
            </div>
          </div>
        </header>

        {/* MAIN BODY: left index, right content */}
        <div className="grid gap-8 md:grid-cols-[260px,minmax(0,1fr)] items-start">
          {/* LEFT: QUICK INDEX */}
          <aside className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5 md:p-6 md:sticky md:top-6 space-y-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-slate-400">
                Quick index
              </p>
              <p className="text-xs md:text-[13px] leading-relaxed text-slate-300">
                Jump straight to the section you need during calls, campaigns or
                copywriting.
              </p>
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {SECTION_INDEX.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="group inline-flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm md:text-[14px] hover:border-sky-500/80 hover:bg-slate-900"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-slate-100 group-hover:bg-sky-500 group-hover:text-slate-950">
                      {s.number}
                    </span>
                    <span className="font-medium text-slate-100 group-hover:text-sky-50">
                      {s.title}
                    </span>
                  </div>
                  <span className="hidden text-[11px] text-slate-500 group-hover:text-sky-200 lg:inline">
                    View
                  </span>
                </a>
              ))}
            </div>
          </aside>

          {/* RIGHT: SUMMARY + SECTIONS */}
          <div className="space-y-8">
            {/* PROFILE SUMMARY CARD */}
            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 md:p-8 space-y-4">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-sky-300/90">
                  Profile summary
                </p>
                <h2 className="text-[1.25rem] md:text-[1.3rem] font-semibold text-slate-50">
                  How to sell to this buyer
                </h2>
                <p className="text-sm md:text-[15px] leading-relaxed text-slate-200">
                  This page is for you as the{" "}
                  <span className="font-semibold">test owner</span>. It gives
                  you the core sales, messaging and offer-fit insights you need
                  to convert this profile — without needing to read their entire
                  Strategic Growth Report.
                </p>
              </div>

              {extended && (
                <div className="mt-3 grid gap-3 rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm md:text-[14px] text-slate-100 md:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-slate-400">
                      Personality layer
                    </p>
                    <p className="mt-1 font-semibold">
                      {extended.personality_label}
                    </p>
                    <p className="mt-1 text-[12px] md:text-[13px] text-slate-300">
                      How they naturally think, lead and relate.
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-slate-400">
                      Mindset layer
                    </p>
                    <p className="mt-1 font-semibold">
                      {extended.mindset_label}
                    </p>
                    <p className="mt-1 text-[12px] md:text-[13px] text-slate-300">
                      Where their business is right now, and what it needs to
                      grow sustainably.
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* GROUP 1: DIAGNOSTIC LAYERS */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-semibold tracking-[0.22em] uppercase text-slate-400">
                  Diagnostic layers • Who they are & where they are in business
                </h2>
                <div className="h-px flex-1 ml-4 bg-gradient-to-r from-slate-700/60 via-slate-800 to-transparent" />
              </div>

              <SectionCard
                id="sec-1-personality"
                number={1}
                title="Personality Layer"
                kicker="How they think, behave and decide at this stage."
              >
                {sectionText(
                  extended?.personality_layer,
                  "Personality layer details have not been defined yet."
                )}
              </SectionCard>

              <SectionCard
                id="sec-2-mindset"
                number={2}
                title="Mindset Layer"
                kicker="Where they are in their current business journey."
              >
                {sectionText(
                  extended?.mindset_layer,
                  "Mindset layer details have not been defined yet."
                )}
              </SectionCard>

              <SectionCard
                id="sec-3-quantum"
                number={3}
                title="Combined Quantum Pattern"
                kicker="How their behaviour and mindset interact to create specific patterns."
              >
                {sectionText(
                  extended?.combined_quantum_pattern,
                  "Combined Quantum pattern has not been defined yet."
                )}
              </SectionCard>
            </div>

            {/* GROUP 2: SALES PLAYBOOK */}
            <div className="space-y-6">
              <div className="flex items-center justify-between pt-4">
                <h2 className="text-[11px] font-semibold tracking-[0.22em] uppercase text-slate-400">
                  Sales playbook • How to communicate, position & sell
                </h2>
                <div className="h-px flex-1 ml-4 bg-gradient-to-r from-slate-700/60 via-slate-800 to-transparent" />
              </div>

              <SectionCard
                id="sec-4-communicate"
                number={4}
                title="How to Communicate"
                kicker="Tone, language and delivery style that makes this buyer feel understood and safe."
              >
                {sectionText(
                  extended?.how_to_communicate,
                  "No communication guidance is available yet."
                )}
              </SectionCard>

              <SectionCard
                id="sec-5-decisions"
                number={5}
                title="How They Make Decisions"
                kicker="What helps them say yes, what makes them hesitate, and the decision filters they use."
              >
                {sectionText(
                  extended?.how_they_make_decisions,
                  "Decision style has not been defined yet."
                )}
              </SectionCard>

              <SectionCard
                id="sec-6-problems"
                number={6}
                title="Core Business Problems"
                kicker="The recurring patterns and friction points that show up most often for this buyer."
              >
                {sectionText(
                  extended?.core_business_problems,
                  "Core business problems have not been defined yet."
                )}
              </SectionCard>

              <SectionCard
                id="sec-7-trust"
                number={7}
                title="What Builds Trust"
                kicker="Signals, proof and experiences that help them feel safe moving forward with you."
              >
                {sectionText(
                  extended?.what_builds_trust,
                  "Trust-building patterns have not been defined yet."
                )}
              </SectionCard>

              <SectionCard
                id="sec-8-offer"
                number={8}
                title="What Offer They Are Ready For"
                kicker="The pricing, structure and level of support most likely to help them say yes and get results."
              >
                {sectionText(
                  extended?.what_offer_ready_for,
                  "Offer readiness has not been defined yet."
                )}
              </SectionCard>

              <SectionCard
                id="sec-9-blockers"
                number={9}
                title="What Blocks the Sale Completely"
                kicker="Fear triggers, misalignments and risk perceptions that stop them from moving ahead."
                variant="danger"
              >
                {sectionText(
                  extended?.what_blocks_sale,
                  "Sale blockers have not been defined yet."
                )}
              </SectionCard>

              <SectionCard
                id="sec-10-precall"
                number={10}
                title="Pre-Call Questions"
                kicker="Conversation starters that reveal both the emotional and structural gaps."
              >
                {sectionText(
                  extended?.pre_call_questions,
                  "Pre-call questions have not been defined yet."
                )}
              </SectionCard>

              <SectionCard
                id="sec-11-microscripts"
                number={11}
                title="Micro Scripts"
                kicker="Short lines you can use in sales calls, emails and live launches."
              >
                {sectionText(
                  extended?.micro_scripts,
                  "Micro scripts have not been defined yet."
                )}
              </SectionCard>

              <SectionCard
                id="sec-12-flags"
                number={12}
                title="Green & Red Flags"
                kicker="What tells you they are a strong fit — and what tells you to pause or reframe."
              >
                {sectionText(
                  extended?.green_red_flags,
                  "Green and red flags have not been defined yet."
                )}
              </SectionCard>

              <SectionCard
                id="sec-13-example"
                number={13}
                title="Real-Life Example"
                kicker="A simple narrative you can keep in mind when speaking to this profile."
              >
                {sectionText(
                  extended?.real_life_example,
                  "Real-life example has not been defined yet."
                )}
              </SectionCard>

              <SectionCard
                id="sec-14-summary"
                number={14}
                title="Final Summary"
                kicker="How to hold this profile in your mind when designing offers and communication."
              >
                {sectionText(
                  extended?.final_summary,
                  "Final summary has not been defined yet."
                )}
              </SectionCard>
            </div>

            <footer className="pt-2 pb-8 text-xs text-slate-500 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <span>
                © {new Date().getFullYear()} MindCanvas — Profiletest.ai
              </span>
              <span className="text-[11px] text-slate-500">
                Internal use only — Extended Source Code for test owners.
              </span>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}

