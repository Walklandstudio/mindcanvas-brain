// apps/web/app/qsc/[token]/leader/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { QscMatrix } from "../../QscMatrix";
import BackgroundGrid from "@/components/ui/BackgroundGrid";

type Audience = "entrepreneur" | "leader";

type PersonalityKey = "FIRE" | "FLOW" | "FORM" | "FIELD";
type MindsetKey = "ORIGIN" | "MOMENTUM" | "VECTOR" | "ORBIT" | "QUANTUM";

type PersonalityPercMap = Partial<Record<PersonalityKey, number>>;
type MindsetPercMap = Partial<Record<MindsetKey, number>>;

type QscResultsRow = {
  id: string;
  test_id: string;
  token: string;
  audience: Audience | null;
  created_at: string;

  personality_percentages: PersonalityPercMap | null;
  mindset_percentages: MindsetPercMap | null;

  primary_personality: PersonalityKey | null;
  primary_mindset: MindsetKey | null;

  combined_profile_code: string | null; // persona_code (A1..D5)
};

type QscProfileRow = {
  id: string;
  profile_label: string | null;
  mindset_level: number | null;
};

type QscTakerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type TemplateRow = {
  id: string;
  section_key: string;
  content: any;
  sort_order: number;
};

type PersonaSectionRow = {
  id: string;
  persona_code: string;
  section_key: string;
  content: any;
  sort_order: number;
};

type ApiPayload = {
  ok: boolean;
  results: QscResultsRow;
  profile: QscProfileRow | null;
  taker: QscTakerRow | null;
  report: {
    test_id: string;
    persona_code: string | null;
    templates: TemplateRow[];
    sections: PersonaSectionRow[];
  };
  __debug?: any;
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

function safeParseJsonMaybe(v: any) {
  if (v == null) return null;
  if (typeof v === "object") return v;
  if (typeof v !== "string") return v;
  const s = v.trim();
  if (!s) return null;
  if (!(s.startsWith("{") || s.startsWith("["))) return v;
  try {
    return JSON.parse(s);
  } catch {
    return v;
  }
}

function contentToText(content: any): string {
  const c = safeParseJsonMaybe(content);
  if (c == null) return "";
  if (typeof c === "string") return c;
  if (typeof c?.text === "string") return c.text;
  if (typeof c?.content === "string") return c.content;
  return "";
}

function renderDocText(content: any) {
  const t = contentToText(content).trim();
  if (!t) return null;
  return (
    <div className="text-[15px] text-slate-100 whitespace-pre-line leading-relaxed">
      {t}
    </div>
  );
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

export default function QscLeaderStrategicReportPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;
  const searchParams = useSearchParams();
  const tid = searchParams?.get("tid") ?? "";
  const debug = searchParams?.get("debug") === "1";
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ApiPayload | null>(null);

  const reportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const apiUrl = tid
          ? `/api/public/qsc/${encodeURIComponent(token)}/leader?tid=${encodeURIComponent(
              tid
            )}`
          : `/api/public/qsc/${encodeURIComponent(token)}/leader`;

        const res = await fetch(apiUrl, { cache: "no-store" });
        const ct = res.headers.get("content-type") || "";

        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(
            `Non-JSON response (${res.status}): ${text.slice(0, 200)}`
          );
        }

        const j = (await res.json()) as ApiPayload;

        if (!res.ok || j?.ok === false) {
          throw new Error((j as any)?.error || `HTTP ${res.status}`);
        }

        if (!j?.results) throw new Error("RESULT_NOT_FOUND");

        // Safety bounce
        if (j.results.audience === "entrepreneur") {
          const base = `/qsc/${encodeURIComponent(token)}/entrepreneur`;
          const href = tid ? `${base}?tid=${encodeURIComponent(tid)}` : base;
          router.replace(href);
          return;
        }

        if (alive) setData(j);
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
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#020617", // ✅ ensures PDF doesn't “wash out”
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

    pdf.save(`qsc-leader-strategic-${token}.pdf`);
  }

  const result = data?.results ?? null;
  const profile = data?.profile ?? null;
  const taker = data?.taker ?? null;

  const createdAt = result?.created_at ? new Date(result.created_at) : null;
  const takerDisplayName = getFullName(taker);

  const snapshotHref = tid
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
    profile?.profile_label ||
    result?.combined_profile_code ||
    "Your Quantum Leadership Profile";

  // Build maps from DB rows
  const templateByKey = useMemo(() => {
    const out: Record<string, TemplateRow> = {};
    for (const r of data?.report?.templates ?? []) out[r.section_key] = r;
    return out;
  }, [data?.report?.templates]);

  const sectionByKey = useMemo(() => {
    const out: Record<string, PersonaSectionRow> = {};
    for (const r of data?.report?.sections ?? []) out[r.section_key] = r;
    return out;
  }, [data?.report?.sections]);

  // Required keys (persona sections only)
  const missing = useMemo(() => {
    const required = [
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
    return required.filter((k) => !contentToText(sectionByKey[k]?.content).trim());
  }, [sectionByKey]);

  if (loading && !result) {
    return (
      <div className="relative min-h-screen bg-[#020617] text-slate-50">
        <BackgroundGrid />
        <main className="relative z-10 mx-auto max-w-5xl px-4 py-12 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
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
      <div className="relative min-h-screen bg-[#020617] text-slate-50">
        <BackgroundGrid />
        <main className="relative z-10 mx-auto max-w-5xl px-4 py-12 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
            Strategic Leadership Report
          </p>
          <h1 className="text-3xl font-bold">Couldn&apos;t load report</h1>
          <pre className="mt-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-100 whitespace-pre-wrap">
            {err || "No data"}
          </pre>
          <div className="flex items-center gap-2 pt-2">
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#020617] text-slate-50">
      <BackgroundGrid />

      <main
        ref={reportRef}
        className="relative z-10 mx-auto max-w-5xl px-4 py-10 md:py-12 space-y-10"
      >
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
              Strategic Leadership Report
            </p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              QSC Leader — Strategic Leadership Report
            </h1>

            {takerDisplayName && (
              <p className="text-[15px] text-slate-300">
                For:{" "}
                <span className="font-semibold text-slate-50">
                  {takerDisplayName}
                </span>
              </p>
            )}

            <p className="text-[15px] text-slate-300 max-w-2xl">
              This report is rendered from{" "}
              <code className="text-slate-100">portal.qsc_leader_report_templates</code>{" "}
              and{" "}
              <code className="text-slate-100">portal.qsc_leader_report_sections</code>.
            </p>

            {debug && data && (
              <pre className="mt-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-200 whitespace-pre-wrap">
                {JSON.stringify(data.__debug ?? {}, null, 2)}
              </pre>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 text-xs text-slate-400">
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-2 text-xs font-medium text-slate-50 shadow-sm hover:bg-slate-900"
            >
              Download PDF
            </button>


            {createdAt && (
              <span>
                Created{" "}
                {createdAt.toLocaleString(undefined, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </header>

        {/* Only show missing warnings in debug mode */}
        {debug && missing.length > 0 && data && (
          <section className="rounded-3xl border border-rose-400/40 bg-rose-500/10 p-6">
            <div className="text-sm font-semibold text-rose-100">
              Missing content for persona {data.report.persona_code ?? "null"}
            </div>
            <ul className="mt-3 list-disc pl-5 text-xs text-rose-100/90 space-y-1">
              {missing.map((k) => (
                <li key={k}>
                  <code className="text-rose-50">section:{k}</code>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Profile header */}
        <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-6 md:p-8 space-y-2">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
            STRATEGIC LEADERSHIP REPORT
          </p>
          <h2 className="text-2xl font-semibold">{personaName}</h2>
        </section>

        {/* ✅ Introduction + How to use (side-by-side) from templates */}
        <section className="grid gap-6 md:grid-cols-2 items-start">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-6 md:p-8 space-y-3">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-300">
              INTRODUCTION
            </p>
            {renderDocText(templateByKey["introduction"]?.content) ?? (
              <div className="text-sm text-slate-400">
                (No introduction template found)
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-6 md:p-8 space-y-3">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-300">
              HOW TO USE THIS REPORT
            </p>
            {renderDocText(templateByKey["how_to_use"]?.content) ?? (
              <div className="text-sm text-slate-400">
                (No how_to_use template found)
              </div>
            )}
          </div>
        </section>

        {/* Charts */}
        <section className="grid gap-6 md:grid-cols-2 items-start">
          <div className="rounded-3xl bg-slate-950/70 text-slate-50 border border-slate-800 p-6 md:p-7 space-y-4">
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

          <div className="rounded-3xl bg-slate-950/70 text-slate-50 border border-slate-800 p-6 md:p-7 space-y-4">
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

        {/* Matrix */}
        <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-6 md:p-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
            Leadership Persona Matrix
          </p>
          <h2 className="text-xl font-semibold">
            Where your leadership frequency meets your mindset level
          </h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70">
            <QscMatrix
              primaryPersonality={effectivePrimaryPersonality}
              primaryMindset={effectivePrimaryMindset}
            />
          </div>
        </section>

        {/* Persona sections */}
        <section className="rounded-3xl border border-amber-400/30 bg-amber-500/10 p-6 md:p-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-amber-200">
            1. YOUR QUANTUM PROFILE SUMMARY
          </p>
          {renderDocText(sectionByKey["quantum_profile_summary"]?.content)}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-6 md:p-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-300">
            2. YOUR PERSONALITY LAYER
          </p>
          {renderDocText(sectionByKey["personality_layer"]?.content)}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-6 md:p-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-300">
            3. YOUR MINDSET LAYER
          </p>
          {renderDocText(sectionByKey["mindset_layer"]?.content)}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-6 md:p-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-300">
            4. YOUR COMBINED QUANTUM PATTERN
          </p>
          {renderDocText(sectionByKey["combined_quantum_pattern"]?.content)}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-6 md:p-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-300">
            5. YOUR STRATEGIC LEADERSHIP PRIORITIES
          </p>
          {renderDocText(sectionByKey["strategic_leadership_priorities"]?.content)}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-6 md:p-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-300">
            6. 30 DAY LEADERSHIP ACTION PLAN
          </p>
          {renderDocText(sectionByKey["leadership_action_plan_30_day"]?.content)}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-6 md:p-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-300">
            7. YOUR LEADERSHIP ROADMAP
          </p>
          {renderDocText(sectionByKey["leadership_roadmap"]?.content)}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-6 md:p-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-300">
            8. COMMUNICATION AND DECISION STYLE
          </p>
          {renderDocText(sectionByKey["communication_and_decision_style"]?.content)}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-6 md:p-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-300">
            9. REFLECTION PROMPTS
          </p>
          {renderDocText(sectionByKey["reflection_prompts"]?.content)}
        </section>

        <section className="rounded-3xl border border-amber-400/30 bg-amber-500/10 p-6 md:p-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-amber-200">
            10. ONE PAGE QUANTUM SUMMARY
          </p>
          {renderDocText(sectionByKey["one_page_quantum_summary"]?.content)}
        </section>

        <footer className="pt-4 pb-6 text-xs text-slate-500">
          © {new Date().getFullYear()} MindCanvas — Profiletest.ai
        </footer>
      </main>
    </div>
  );
}


