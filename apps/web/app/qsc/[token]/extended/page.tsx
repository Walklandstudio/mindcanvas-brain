// apps/web/app/qsc/[token]/extended/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
  {
    id: "sec-9-blockers",
    number: 9,
    title: "What Blocks the Sale Completely",
  },
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

export default function QscExtendedPage({ params }: { params: { token: string } }) {
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
          ? `/api/public/qsc/${encodeURIComponent(token)}/extended?tid=${encodeURIComponent(
              tid
            )}`
          : `/api/public/qsc/${encodeURIComponent(token)}/extended`;

        const res = await fetch(apiUrl, { cache: "no-store" });

        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(
            `Non-JSON response (${res.status}): ${text.slice(0, 200)}`
          );
        }

        const j = (await res.json()) as
          | ({
              ok?: boolean;
              error?: string;
              results?: QscResultsRow;
              profile?: QscProfileRow | null;
              extended?: QscExtendedRow | null;
              taker?: QscTakerRow | null;
            } & Record<string, unknown>)
          | { ok?: boolean; error?: string };

        if (!res.ok || (j as any).ok === false) {
          throw new Error((j as any).error || `HTTP ${res.status}`);
        }

        const cast = j as any;
        if (alive && cast.results) {
          setPayload({
            results: cast.results,
            profile: cast.profile ?? null,
            extended: cast.extended ?? null,
            taker: cast.taker ?? null,
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
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
    });

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

    pdf.save(`qsc-extended-${token}.pdf`);
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
            Preparing Extended Source Code…
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

  const createdAt = new Date(results.created_at);
  const personaLabel =
    extended?.persona_label ||
    profile?.profile_label ||
    results.combined_profile_code ||
    "Quantum profile";

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
        {/* Header */}
        <header className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
              Quantum Source Code
            </p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Extended Source Code — Internal Insights
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
              Deep sales and messaging insights for this Quantum buyer profile.
              Use this as your reference when designing offers, sales pages,
              email sequences, and live launch scripts.
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

        {/* (rest of your file unchanged from here down) */}
        {/* Layout with index + content */}
        <div className="grid gap-8 md:grid-cols-[260px,minmax(0,1fr)] items-start">
          {/* Index */}
          <aside className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5 md:p-6 md:sticky md:top-6 space-y-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-slate-400">
                Quick index
              </p>
              <p className="text-[13px] md:text-[14px] leading-relaxed text-slate-300">
                Jump straight to the section you need during calls, campaigns or
                copywriting.
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

          {/* Main content */}
          <div className="space-y-8">
            {/* ...your existing content exactly as you pasted... */}
            {/* (no changes below) */}
          </div>
        </div>
      </main>
    </div>
  );
}

