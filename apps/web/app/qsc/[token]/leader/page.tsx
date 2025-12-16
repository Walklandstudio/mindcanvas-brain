"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// IMPORTANT: Shared matrix import (NOT ./QscMatrix)
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

type LeaderSections = {
  // EXACT doc structure keys
  introduction?: string;
  how_to_use?: string;
  quantum_profile_summary?: string;
  personality_layer?: string;
  mindset_layer?: string;
  combined_quantum_pattern?: string;
  strategic_leadership_priorities?: string;
  leadership_action_plan_30_day?: string;
  leadership_roadmap?: string;
  communication_and_decision_style?: string;
  reflection_prompts?: string;
  one_page_quantum_summary?: string;

  // Optional helper key
  _doc_profile?: string;
};

type QscLeaderPersonaRow = {
  id: string;
  test_id: string;
  profile_code: string | null;
  profile_label: string | null;
  personality_code: string | null;
  mindset_level: number | null;
  sections?: LeaderSections | null;
};

type QscTakerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company: string | null;
  role_title: string | null;
};

type QscPayload = {
  results: QscResultsRow;
  profile: QscProfileRow | null;
  persona?: QscLeaderPersonaRow | null;
  taker: QscTakerRow | null;
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

const FREQUENCY_COLORS: Record<PersonalityKey, string> = {
  FIRE: "#f97316",
  FLOW: "#0ea5e9",
  FORM: "#22c55e",
  FIELD: "#a855f7",
};

function normalisePercent(raw: number | undefined | null): number {
  if (raw == null || !Number.isFinite(raw)) return 0;
  if (raw > 0 && raw <= 1.5) return Math.min(100, Math.max(0, raw * 100));
  return Math.min(100, Math.max(0, raw));
}

function getFullName(taker: QscTakerRow | null | undefined): string | null {
  if (!taker) return null;
  const first = (taker.first_name || "").trim();
  const last = (taker.last_name || "").trim();
  const full = `${first} ${last}`.trim();
  if (full) return full;
  const email = (taker.email || "").trim();
  return email || null;
}

type FrequencyDonutDatum = {
  key: PersonalityKey;
  label: string;
  value: number;
};

function FrequencyDonut({ data }: { data: FrequencyDonutDatum[] }) {
  const total =
    data.reduce((sum, d) => sum + (isFinite(d.value) ? d.value : 0), 0) || 1;

  const radius = 60;
  const strokeWidth = 20;
  const center = 80;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <svg viewBox="0 0 160 160" className="h-40 w-40 md:h-48 md:w-48">
      <circle
        cx={center}
        cy={center}
        r={radius}
        stroke="rgba(15,23,42,0.9)"
        strokeWidth={strokeWidth}
        fill="transparent"
      />

      {data.map((d) => {
        const fraction = (isFinite(d.value) ? d.value : 0) / total;
        const dash = circumference * fraction;
        const dashArray = `${dash} ${circumference}`;
        const strokeDashoffset = offset;
        offset -= dash;

        return (
          <circle
            key={d.key}
            cx={center}
            cy={center}
            r={radius}
            stroke={FREQUENCY_COLORS[d.key]}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={dashArray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        );
      })}

      <circle cx={center} cy={center} r={radius - strokeWidth} fill="#020617" />

      <text x={center} y={center - 4} textAnchor="middle" fill="#e5e7eb">
        LEADERSHIP
      </text>
      <text x={center} y={center + 12} textAnchor="middle" fill="#e5e7eb">
        FREQUENCY
      </text>
    </svg>
  );
}

function renderDocText(value?: string | null) {
  const t = (value || "").trim();
  if (!t) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        <div className="font-semibold">Missing content</div>
        <div className="mt-1 text-xs text-rose-700/80">
          This section is blank in{" "}
          <code>portal.qsc_leader_personas.sections</code>. Fix the DB row — we’re
          not auto-filling anything.
        </div>
      </div>
    );
  }
  return (
    <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
      {t}
    </div>
  );
}

function missingKeys(sections: LeaderSections | null | undefined) {
  const s = sections || {};
  const required: Array<keyof LeaderSections> = [
    "introduction",
    "how_to_use",
    "quantum_profile_summary",
    "personality_layer",
    "mindset_layer",
    "combined_quantum_pattern",
    "strategic_leadership_priorities",
    "leadership_action_plan_30_day",
    "leadership_roadmap",
    "communication_and_decision_style",
    "reflection_prompts",
    "one_page_quantum_summary",
  ];

  return required
    .filter((k) => {
      const v = (s as any)[k];
      return typeof v !== "string" || v.trim().length === 0;
    })
    .map(String);
}

export default function QscLeaderStrategicReportPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;
  const searchParams = useSearchParams();
  const tid = searchParams?.get("tid") ?? "";
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [payload, setPayload] = useState<QscPayload | null>(null);

  const reportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const apiUrl = tid
          ? `/api/public/qsc/${encodeURIComponent(token)}/result?tid=${encodeURIComponent(
              tid
            )}`
          : `/api/public/qsc/${encodeURIComponent(token)}/result`;

        const res = await fetch(apiUrl, { cache: "no-store" });

        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(
            `Non-JSON response (${res.status}): ${text.slice(0, 200)}`
          );
        }

        const j = await res.json();

        if (!res.ok || j?.ok === false) {
          throw new Error(j?.error || `HTTP ${res.status}`);
        }

        if (!j?.results) throw new Error("RESULT_NOT_FOUND");

        // Safety: if someone hits /leader but the result is entrepreneur, bounce them
        if (j.results.audience === "entrepreneur") {
          const base = `/qsc/${encodeURIComponent(token)}/entrepreneur`;
          const href = tid ? `${base}?tid=${encodeURIComponent(tid)}` : base;
          router.replace(href);
          return;
        }

        if (alive) {
          setPayload({
            results: j.results,
            profile: j.profile ?? null,
            persona: j.persona ?? null,
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
  }, [token, tid, router]);

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

    pdf.save(`qsc-leader-strategic-${token}.pdf`);
  }

  // ✅ Compute everything BEFORE any early returns (NO hook ordering issues)
  const result = payload?.results ?? null;
  const profile = payload?.profile ?? null;
  const persona = payload?.persona ?? null;
  const taker = payload?.taker ?? null;

  const sections = (persona?.sections ?? null) as LeaderSections | null;
  const misses = missingKeys(sections);

  const takerDisplayName = getFullName(taker);

  const backHref = tid
    ? `/qsc/${encodeURIComponent(token)}?tid=${encodeURIComponent(tid)}`
    : `/qsc/${encodeURIComponent(token)}`;

  const personalityPercRaw =
    (result?.personality_percentages ?? {}) as PersonalityPercMap;
  const mindsetPercRaw = (result?.mindset_percentages ?? {}) as MindsetPercMap;

  const personalityPerc: PersonalityPercMap = {
    FIRE: normalisePercent(personalityPercRaw.FIRE ?? 0),
    FLOW: normalisePercent(personalityPercRaw.FLOW ?? 0),
    FORM: normalisePercent(personalityPercRaw.FORM ?? 0),
    FIELD: normalisePercent(personalityPercRaw.FIELD ?? 0),
  };

  const mindsetPerc: MindsetPercMap = {
    ORIGIN: normalisePercent(mindsetPercRaw.ORIGIN ?? 0),
    MOMENTUM: normalisePercent(mindsetPercRaw.MOMENTUM ?? 0),
    VECTOR: normalisePercent(mindsetPercRaw.VECTOR ?? 0),
    ORBIT: normalisePercent(mindsetPercRaw.ORBIT ?? 0),
    QUANTUM: normalisePercent(mindsetPercRaw.QUANTUM ?? 0),
  };

  const frequencyDonutData: FrequencyDonutDatum[] = ([
    "FIRE",
    "FLOW",
    "FORM",
    "FIELD",
  ] as PersonalityKey[]).map((key) => ({
    key,
    label: PERSONALITY_LABELS[key],
    value: personalityPerc[key] ?? 0,
  }));

  const effectivePrimaryPersonality =
    result?.primary_personality ?? ("FIRE" as PersonalityKey);
  const effectivePrimaryMindset =
    result?.primary_mindset ?? ("ORIGIN" as MindsetKey);

  const personaName =
    persona?.profile_label ||
    profile?.profile_label ||
    "Your Quantum Leadership Profile";

  // ------------------ early returns now safe ------------------

  if (loading && !result) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <main className="mx-auto max-w-5xl px-4 py-12 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-700">
            Strategic Leadership Report
          </p>
          <h1 className="mt-3 text-3xl font-bold">
            Preparing your QSC Leader report…
          </h1>
        </main>
      </div>
    );
  }

  if (err || !result) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <main className="mx-auto max-w-5xl px-4 py-12 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-700">
            Strategic Leadership Report
          </p>
          <h1 className="text-3xl font-bold">Couldn&apos;t load report</h1>
          <pre className="mt-2 rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 whitespace-pre-wrap">
            {err || "No data"}
          </pre>
          <div className="text-xs text-slate-600">
            Token: <code>{token}</code>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <main
        ref={reportRef}
        className="mx-auto max-w-5xl px-4 py-10 md:py-12 space-y-10"
      >
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-700">
              Strategic Leadership Report
            </p>
            <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
              QSC Leader — Strategic Leadership Report
            </h1>

            {takerDisplayName && (
              <p className="mt-1 text-sm text-slate-700">
                For: <span className="font-semibold">{takerDisplayName}</span>
              </p>
            )}

            <p className="mt-2 text-sm text-slate-700 max-w-2xl">
              This report is rendered strictly from the Word document content
              stored in <code>portal.qsc_leader_personas.sections</code>.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 text-xs text-slate-600">
            <Link
              href={backHref}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
            >
              ← Back to Snapshot
            </Link>
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
            >
              Download PDF
            </button>
          </div>
        </header>

        {misses.length > 0 && (
          <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
            <div className="text-sm font-semibold text-rose-800">
              Missing section content for {persona?.profile_code ?? "this persona"}
            </div>
            <div className="mt-1 text-xs text-rose-800/80">
              Fix the DB row. We do not fill defaults.
            </div>
            <ul className="mt-3 list-disc pl-5 text-xs text-rose-900 space-y-1">
              {misses.map((k) => (
                <li key={k}>
                  <code>{k}</code>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Title / Profile */}
        <section className="rounded-3xl bg-white shadow-sm border border-slate-200 p-6 md:p-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-700">
            Your Leadership Profile
          </p>
          <h2 className="text-2xl font-semibold">{personaName}</h2>
        </section>

        {/* Charts + Matrix */}
        <section className="grid gap-6 md:grid-cols-2 items-start">
          <div className="rounded-3xl bg-[#020617] text-slate-50 border border-slate-800 p-6 md:p-7 space-y-4">
            <h2 className="text-lg font-semibold">Leadership Frequency Type</h2>
            <p className="text-sm text-slate-300">
              Your energetic style across Fire, Flow, Form and Field in how you lead.
            </p>

            <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center">
              <div className="flex justify-center">
                <FrequencyDonut data={frequencyDonutData} />
              </div>
              <div className="space-y-3 text-sm">
                {frequencyDonutData.map((d) => (
                  <div
                    key={d.key}
                    className="flex items-center justify-between gap-3"
                  >
                    <span>{d.label}</span>
                    <span className="tabular-nums">{Math.round(d.value)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-[#020617] text-slate-50 border border-slate-800 p-6 md:p-7 space-y-4">
            <h2 className="text-lg font-semibold">Leadership Mindset Levels</h2>
            <p className="text-sm text-slate-300">
              Where your focus and energy sit across the 5 growth stages.
            </p>

            <div className="space-y-2 pt-2 text-xs">
              {(
                ["ORIGIN", "MOMENTUM", "VECTOR", "ORBIT", "QUANTUM"] as MindsetKey[]
              ).map((key) => {
                const pct = Math.round(mindsetPerc[key] ?? 0);
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between">
                      <span>{MINDSET_LABELS[key]}</span>
                      <span className="tabular-nums">{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-900">
                      <div
                        className="h-2 rounded-full bg-emerald-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white shadow-sm border border-slate-200 p-6 md:p-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-700">
            Leadership Persona Matrix
          </p>
          <h2 className="text-xl font-semibold">
            Where your leadership frequency meets your mindset level
          </h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50">
            <QscMatrix
              primaryPersonality={effectivePrimaryPersonality}
              primaryMindset={effectivePrimaryMindset}
            />
          </div>
        </section>

        {/* WORD DOC SECTIONS (EXACT ORDER) */}
        <section className="rounded-3xl bg-white shadow-sm border border-slate-200 p-6 md:p-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-700">
            INTRODUCTION
          </p>
          {renderDocText(sections?.introduction)}
        </section>

        <section className="rounded-3xl bg-white shadow-sm border border-slate-200 p-6 md:p-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-700">
            HOW TO USE THIS REPORT
          </p>
          {renderDocText(sections?.how_to_use)}
        </section>

        <section className="rounded-3xl bg-[#f5eddc] border border-amber-200 p-6 md:p-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-amber-700">
            1. Your Quantum Profile Summary
          </p>
          {renderDocText(sections?.quantum_profile_summary)}
        </section>

        <section className="rounded-3xl bg-white shadow-sm border border-slate-200 p-6 md:p-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-700">
            2. Your Personality Layer
          </p>
          {renderDocText(sections?.personality_layer)}
        </section>

        <section className="rounded-3xl bg-white shadow-sm border border-slate-200 p-6 md:p-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-700">
            3. Your Mindset Layer
          </p>
          {renderDocText(sections?.mindset_layer)}
        </section>

        <section className="rounded-3xl bg-white shadow-sm border border-slate-200 p-6 md:p-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-700">
            4. Your Combined Quantum Pattern
          </p>
          {renderDocText(sections?.combined_quantum_pattern)}
        </section>

        <section className="rounded-3xl bg-white shadow-sm border border-slate-200 p-6 md:p-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-700">
            5. Your Strategic Leadership Priorities
          </p>
          {renderDocText(sections?.strategic_leadership_priorities)}
        </section>

        <section className="rounded-3xl bg-white shadow-sm border border-slate-200 p-6 md:p-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-700">
            6. 30 Day Leadership Action Plan
          </p>
          {renderDocText(sections?.leadership_action_plan_30_day)}
        </section>

        <section className="rounded-3xl bg-white shadow-sm border border-slate-200 p-6 md:p-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-700">
            7. Your Leadership Roadmap
          </p>
          {renderDocText(sections?.leadership_roadmap)}
        </section>

        <section className="rounded-3xl bg-white shadow-sm border border-slate-200 p-6 md:p-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-700">
            8. Communication and Decision Style
          </p>
          {renderDocText(sections?.communication_and_decision_style)}
        </section>

        <section className="rounded-3xl bg-white shadow-sm border border-slate-200 p-6 md:p-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-700">
            9. Reflection Prompts
          </p>
          {renderDocText(sections?.reflection_prompts)}
        </section>

        <section className="rounded-3xl bg-[#f5eddc] border border-amber-200 p-6 md:p-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-amber-700">
            10. One Page Quantum Summary
          </p>
          {renderDocText(sections?.one_page_quantum_summary)}
        </section>

        <footer className="pt-4 pb-6 text-xs text-slate-500">
          © {new Date().getFullYear()} MindCanvas — Profiletest.ai
        </footer>
      </main>
    </div>
  );
}


