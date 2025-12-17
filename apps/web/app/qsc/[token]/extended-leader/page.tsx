"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import AppBackground from "@/components/ui/AppBackground";

type PersonalityKey = "FIRE" | "FLOW" | "FORM" | "FIELD";
type MindsetKey = "ORIGIN" | "MOMENTUM" | "VECTOR" | "ORBIT" | "QUANTUM";

type QscResultsRow = {
  id: string;
  test_id: string;
  token: string;
  primary_personality: PersonalityKey | null;
  secondary_personality: PersonalityKey | null;
  primary_mindset: MindsetKey | null;
  secondary_mindset: MindsetKey | null;
  combined_profile_code: string | null;
  audience: "entrepreneur" | "leader" | null;
  created_at: string;
};

type QscProfileRow = {
  id: string;
  personality_code: string | null;
  mindset_level: number | null;
  profile_code: string | null;
  profile_label: string | null;
};

type QscExtendedRow = {
  persona_label: string | null;
  personality_label: string | null;
  mindset_label: string | null;
  profile_code: string | null;

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

type QscTakerRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

type QscExtendedPayload = {
  results: QscResultsRow;
  profile: QscProfileRow | null;
  extended: QscExtendedRow | null;
  taker: QscTakerRow | null;
};

type SectionMeta = {
  id: string;
  number: number;
  title: string;
};

const SECTIONS: SectionMeta[] = [
  { id: "sec-1-personality", number: 1, title: "Personality Layer" },
  { id: "sec-2-mindset", number: 2, title: "Mindset Layer" },
  { id: "sec-3-quantum", number: 3, title: "Combined Quantum Pattern" },
  { id: "sec-4-communicate", number: 4, title: "How to Communicate" },
  { id: "sec-5-decisions", number: 5, title: "How They Make Decisions" },
  { id: "sec-6-problems", number: 6, title: "Core Business Problems" },
  { id: "sec-7-trust", number: 7, title: "What Builds Trust" },
  { id: "sec-8-offer", number: 8, title: "What Offer They Are Ready For" },
  { id: "sec-9-blockers", number: 9, title: "What Blocks the Sale Completely" },
  { id: "sec-10-precall", number: 10, title: "Pre-Call Questions" },
  { id: "sec-11-microscripts", number: 11, title: "Micro Scripts" },
  { id: "sec-12-flags", number: 12, title: "Green & Red Flags" },
  { id: "sec-13-example", number: 13, title: "Real-Life Example" },
  { id: "sec-14-summary", number: 14, title: "Final Summary" },
];

function fallbackCopy(value: string | null | undefined, fallback: string) {
  const trimmed = (value || "").trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function getFullName(taker: QscTakerRow | null | undefined): string | null {
  if (!taker) return null;

  const rawFirst =
    (typeof taker.first_name === "string" && taker.first_name) ||
    (typeof taker.firstName === "string" && taker.firstName) ||
    "";
  const rawLast =
    (typeof taker.last_name === "string" && taker.last_name) ||
    (typeof taker.lastName === "string" && taker.lastName) ||
    "";

  const first = rawFirst.trim();
  const last = rawLast.trim();
  const full = `${first} ${last}`.trim();
  if (full) return full;

  const email = (taker.email || "").trim();
  return email || null;
}

type InsightSectionProps = {
  id: string;
  number: number;
  title: string;
  kicker?: string;
  children: string;
  variant?: "default" | "danger";
};

function InsightSection({
  id,
  number,
  title,
  kicker,
  children,
  variant = "default",
}: InsightSectionProps) {
  const danger = variant === "danger";

  return (
    <section
      id={id}
      className={[
        "scroll-mt-28 rounded-3xl border p-6 md:p-8 space-y-3",
        danger
          ? "border-rose-600/50 bg-gradient-to-br from-slate-950 via-slate-950 to-rose-950/40"
          : "border-slate-800 bg-slate-950/80",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            danger
              ? "bg-rose-500/20 text-rose-100 border border-rose-400/60"
              : "bg-sky-500/15 text-sky-100 border border-sky-400/50",
          ].join(" ")}
        >
          {number}
        </div>
        <div className="space-y-1.5">
          <h2
            className={[
              "text-lg md:text-xl font-semibold",
              danger ? "text-rose-50" : "text-slate-50",
            ].join(" ")}
          >
            {title}
          </h2>
          {kicker && (
            <p
              className={[
                "text-[15px] leading-relaxed",
                danger ? "text-rose-100/80" : "text-slate-300",
              ].join(" ")}
            >
              {kicker}
            </p>
          )}
        </div>
      </div>

      <div
        className={[
          "pt-3 text-[15px] leading-relaxed whitespace-pre-line",
          danger ? "text-rose-50" : "text-slate-100",
        ].join(" ")}
      >
        {children}
      </div>
    </section>
  );
}

export default function QscLeaderExtendedPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;
  const searchParams = useSearchParams();
  const tid = searchParams?.get("tid") ?? "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [payload, setPayload] = useState<QscExtendedPayload | null>(null);

  const reportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const apiUrl = tid
          ? `/api/public/qsc/${encodeURIComponent(
              token
            )}/extended-leader?tid=${encodeURIComponent(tid)}`
          : `/api/public/qsc/${encodeURIComponent(token)}/extended-leader`;

        const res = await fetch(apiUrl, { cache: "no-store" });

        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(
            `Non-JSON response (${res.status}): ${text.slice(0, 200)}`
          );
        }

        const j = (await res.json()) as any;

        if (!res.ok || j?.ok === false) {
          throw new Error(j?.error || `HTTP ${res.status}`);
        }

        if (alive && j?.results) {
          setPayload({
            results: j.results,
            profile: j.profile ?? null,
            extended: j.extended ?? null,
            taker: j.taker ?? null,
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
  }, [token, tid]);

  async function handleDownloadPdf() {
    if (!reportRef.current) return;

    const element = reportRef.current;
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`qsc-extended-leader-${token}.pdf`);
  }

  const results = payload?.results ?? null;
  const profile = payload?.profile ?? null;
  const extended = payload?.extended ?? null;
  const taker = payload?.taker ?? null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <main className="mx-auto max-w-5xl px-4 py-12 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
            Quantum Source Code
          </p>
          <h1 className="mt-3 text-3xl font-bold">
            Preparing Leader Extended Source Code…
          </h1>
        </main>
      </div>
    );
  }

  if (err || !results) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <main className="mx-auto max-w-5xl px-4 py-12 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
            Quantum Source Code
          </p>
          <h1 className="text-3xl font-bold">Couldn&apos;t load insights</h1>
          <p className="text-[15px] text-slate-300">
            We weren&apos;t able to load the Leader Extended Source Code internal
            insights for this profile.
          </p>
          <pre className="mt-2 rounded-xl border border-slate-800 bg-slate-950/90 p-3 text-xs text-slate-100 whitespace-pre-wrap">
            {err || "No data"}
          </pre>
        </main>
      </div>
    );
  }

  const createdAt = new Date(results.created_at);
  const personaLabel =
    extended?.persona_label ||
    profile?.profile_label ||
    results.combined_profile_code ||
    "Leader profile";

  const takerDisplayName = getFullName(taker);

  const snapshotHref = tid
    ? `/qsc/${encodeURIComponent(token)}?tid=${encodeURIComponent(tid)}`
    : `/qsc/${encodeURIComponent(token)}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <main
        ref={reportRef}
        className="mx-auto max-w-6xl px-4 py-10 md:py-12 space-y-10"
      >
        <header className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
              Quantum Source Code
            </p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Leader Extended Source Code — Internal Insights
            </h1>
            {takerDisplayName && (
              <p className="text-[15px] text-slate-300">
                For:{" "}
                <span className="font-semibold text-slate-50">
                  {takerDisplayName}
                </span>
              </p>
            )}
            <p className="text-[15px] leading-relaxed text-slate-300 max-w-2xl">
              Deep leadership, messaging and positioning insights for this
              profile. Use this as your reference when coaching, leading,
              delegating and structuring accountability.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 text-xs text-slate-400">
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center rounded-xl border border-slate-600 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-50 shadow-sm hover:bg-slate-800"
            >
              Download PDF
            </button>
            <Link
              href={snapshotHref}
              className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium hover:bg-slate-800"
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
              Combined profile:{" "}
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

        <div className="grid gap-8 md:grid-cols-[260px,minmax(0,1fr)] items-start">
          <aside className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5 md:p-6 md:sticky md:top-6 space-y-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-slate-400">
                Quick index
              </p>
              <p className="text-[13px] md:text-[14px] leading-relaxed text-slate-300">
                Jump straight to the section you need during calls, coaching or
                leadership conversations.
              </p>
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {SECTIONS.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className="group inline-flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-[14px] hover:border-sky-500/80 hover:bg-slate-900"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-slate-100 group-hover:bg-sky-500 group-hover:text-slate-950">
                      {sec.number}
                    </span>
                    <span className="font-medium text-slate-100 group-hover:text-sky-50">
                      {sec.title}
                    </span>
                  </div>
                  <span className="hidden text-[11px] text-slate-500 group-hover:text-sky-200 lg:inline">
                    View
                  </span>
                </a>
              ))}
            </div>
          </aside>

          <div className="space-y-8">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 md:p-8 space-y-4">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-sky-300/90">
                  Profile summary
                </p>
                <h2 className="text-lg md:text-xl font-semibold text-slate-50">
                  How to lead this profile well
                </h2>
                <p className="text-[15px] leading-relaxed text-slate-200 max-w-2xl">
                  This page is for you as the{" "}
                  <span className="font-semibold">test owner</span>. It gives
                  you the leadership, communication and trust insights you need
                  for this profile — without needing the full Strategic Growth
                  Report.
                </p>
              </div>

              {extended && (
                <div className="mt-3 grid gap-3 rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-[15px] text-slate-100 md:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-slate-400">
                      Personality layer
                    </p>
                    <p className="mt-1 font-semibold">
                      {extended.personality_label}
                    </p>
                    <p className="mt-1 text-xs text-slate-300">
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
                    <p className="mt-1 text-xs text-slate-300">
                      Where they are right now and what helps them grow.
                    </p>
                  </div>
                </div>
              )}
            </section>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-semibold tracking-[0.22em] uppercase text-slate-400">
                  Diagnostic layers • Who they are &amp; where they are
                </h2>
                <div className="h-px flex-1 ml-4 bg-gradient-to-r from-slate-700/60 via-slate-800 to-transparent" />
              </div>

              <InsightSection
                id="sec-1-personality"
                number={1}
                title="Personality Layer"
                kicker="How they think, behave and decide at this stage."
                children={fallbackCopy(
                  extended?.personality_layer,
                  "Personality layer details have not been defined yet."
                )}
              />

              <InsightSection
                id="sec-2-mindset"
                number={2}
                title="Mindset Layer"
                kicker="Where they are in their current journey."
                children={fallbackCopy(
                  extended?.mindset_layer,
                  "Mindset layer details have not been defined yet."
                )}
              />

              <InsightSection
                id="sec-3-quantum"
                number={3}
                title="Combined Quantum Pattern"
                kicker="How their behaviour and mindset interact to create patterns."
                children={fallbackCopy(
                  extended?.combined_quantum_pattern,
                  "Combined Quantum pattern has not been defined yet."
                )}
              />
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between pt-4">
                <h2 className="text-[11px] font-semibold tracking-[0.22em] uppercase text-slate-400">
                  Leadership playbook • How to communicate, trust &amp; lead
                </h2>
                <div className="h-px flex-1 ml-4 bg-gradient-to-r from-slate-700/60 via-slate-800 to-transparent" />
              </div>

              <InsightSection
                id="sec-4-communicate"
                number={4}
                title="How to Communicate"
                kicker="Tone, language and delivery style that makes them feel safe and clear."
                children={fallbackCopy(
                  extended?.how_to_communicate,
                  "No communication guidance is available yet."
                )}
              />

              <InsightSection
                id="sec-5-decisions"
                number={5}
                title="How They Make Decisions"
                kicker="What helps them commit, what makes them hesitate, and how they filter choices."
                children={fallbackCopy(
                  extended?.how_they_make_decisions,
                  "Decision style has not been defined yet."
                )}
              />

              <InsightSection
                id="sec-6-problems"
                number={6}
                title="Core Business Problems"
                kicker="The recurring patterns and friction points that show up most often."
                children={fallbackCopy(
                  extended?.core_business_problems,
                  "Core business problems have not been defined yet."
                )}
              />

              <InsightSection
                id="sec-7-trust"
                number={7}
                title="What Builds Trust"
                kicker="Signals, proof and experiences that help them trust you and the process."
                children={fallbackCopy(
                  extended?.what_builds_trust,
                  "Trust-building patterns have not been defined yet."
                )}
              />

              <InsightSection
                id="sec-8-offer"
                number={8}
                title="What Offer They Are Ready For"
                kicker="The structure, support and expectations most likely to unlock performance."
                children={fallbackCopy(
                  extended?.what_offer_ready_for,
                  "Offer readiness has not been defined yet."
                )}
              />

              <InsightSection
                id="sec-9-blockers"
                number={9}
                title="What Blocks the Sale Completely"
                kicker="Fear triggers and misalignments that stop buy-in or commitment."
                variant="danger"
                children={fallbackCopy(
                  extended?.what_blocks_sale,
                  "Sale blockers have not been defined yet."
                )}
              />

              <InsightSection
                id="sec-10-precall"
                number={10}
                title="Pre-Call Questions"
                kicker="Questions that reveal emotional and structural gaps."
                children={fallbackCopy(
                  extended?.pre_call_questions,
                  "Pre-call questions have not been defined yet."
                )}
              />

              <InsightSection
                id="sec-11-microscripts"
                number={11}
                title="Micro Scripts"
                kicker="Short lines you can use in meetings, coaching, delegation and feedback."
                children={fallbackCopy(
                  extended?.micro_scripts,
                  "Micro scripts have not been defined yet."
                )}
              />

              <InsightSection
                id="sec-12-flags"
                number={12}
                title="Green & Red Flags"
                kicker="What signals strong fit and momentum — and what signals risk."
                children={fallbackCopy(
                  extended?.green_red_flags,
                  "Green and red flags have not been defined yet."
                )}
              />

              <InsightSection
                id="sec-13-example"
                number={13}
                title="Real-Life Example"
                kicker="A simple narrative you can keep in mind for this profile."
                children={fallbackCopy(
                  extended?.real_life_example,
                  "Real-life example has not been defined yet."
                )}
              />

              <InsightSection
                id="sec-14-summary"
                number={14}
                title="Final Summary"
                kicker="How to hold this profile in your mind when leading."
                children={fallbackCopy(
                  extended?.final_summary,
                  "Final summary has not been defined yet."
                )}
              />
            </div>

            <footer className="pt-2 pb-8 text-xs text-slate-500 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <span>© {new Date().getFullYear()} MindCanvas — Profiletest.ai</span>
              <span className="text-[11px] text-slate-500">
                Internal use only — Leader Extended Source Code for test owners.
              </span>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
