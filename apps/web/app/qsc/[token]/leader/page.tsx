// apps/web/app/qsc/[token]/leader/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Shared matrix import
import { QscMatrix } from "../../QscMatrix";

// Standard background (should be used across QSC pages)
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
  personality_totals: Record<string, number> | null;
  personality_percentages: PersonalityPercMap | null;
  mindset_totals: Record<string, number> | null;
  mindset_percentages: MindsetPercMap | null;
  primary_personality: PersonalityKey | null;
  secondary_personality: PersonalityKey | null;
  primary_mindset: MindsetKey | null;
  secondary_mindset: MindsetKey | null;
  combined_profile_code: string | null; // e.g. A1
  qsc_profile_id: string | null;
  audience: Audience | null;
  created_at: string;
};

type QscProfileRow = {
  id: string;
  personality_code: string | null;
  mindset_level: number | null;
  profile_code: string | null;
  profile_label: string | null;
};

type QscTakerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company: string | null;
  role_title: string | null;
};

type LeaderSectionKey =
  | "introduction"
  | "how_to_use"
  | "quantum_profile_summary"
  | "personality_layer"
  | "mindset_layer"
  | "combined_quantum_pattern"
  | "strategic_leadership_priorities"
  | "leadership_action_plan_30_day"
  | "leadership_roadmap"
  | "communication_and_decision_style"
  | "reflection_prompts"
  | "one_page_quantum_summary";

type SectionRow = {
  id: string;
  test_id: string;
  persona_code?: string | null; // A1..D5 (only for qsc_leader_report_sections)
  section_key: LeaderSectionKey;
  content: any; // jsonb (we’ll render safely)
  sort_order: number | null;
  is_active: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type QscPayload = {
  results: QscResultsRow;
  profile: QscProfileRow | null;
  taker: QscTakerRow | null;

  // NEW tables (preferred)
  templates?: SectionRow[]; // portal.qsc_leader_report_templates
  sections?: SectionRow[]; // portal.qsc_leader_report_sections for persona_code

  // Legacy fallback (in case API still returns it)
  persona?: { sections?: Record<string, any> | null; profile_label?: string | null } | null;

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

type FrequencyDonutDatum = { key: PersonalityKey; label: string; value: number };

function FrequencyDonut({ data }: { data: FrequencyDonutDatum[] }) {
  const total =
    data.reduce((sum, d) => sum + (isFinite(d.value) ? d.value : 0), 0) || 1;

  const radius = 60;
  const strokeWidth = 20;
  const center = 80;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <svg viewBox="0 0 160 160" className="h-40 w-40 md:h-48 md:w-48" aria-hidden="true">
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

/**
 * jsonb content renderer:
 * - supports { text: "..." }
 * - supports strings
 * - supports arrays of blocks
 */
function contentToText(content: any): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (typeof content === "number" || typeof content === "boolean") return String(content);

  if (Array.isArray(content)) {
    return content.map((c) => contentToText(c)).filter(Boolean).join("\n\n");
  }

  // common shape: { text: "..." }
  if (typeof content === "object") {
    if (typeof content.text === "string") return content.text;
    if (typeof content.content === "string") return content.content;
    if (typeof content.value === "string") return content.value;

    // last resort: flatten obvious string leaves
    const pieces: string[] = [];
    for (const v of Object.values(content)) {
      const t = contentToText(v);
      if (t) pieces.push(t);
    }
    return pieces.join("\n\n");
  }

  return "";
}

function renderDocText(content: any, opts: { debug: boolean }) {
  const t = contentToText(content).trim();

  if (!t) {
    if (!opts.debug) return null;

    return (
      <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
        <div className="font-semibold">Missing content</div>
        <div className="mt-1 text-xs text-rose-100/80">
          This section is blank in the database row for this persona/template.
        </div>
      </div>
    );
  }

  return (
    <div className="text-[15px] text-slate-100 whitespace-pre-line leading-relaxed">
      {t}
    </div>
  );
}

function sectionCardTitle(n: number, base: string, suffix?: string | null): string {
  const s = (suffix || "").trim();
  return s ? `${n}. ${base} — ${s}` : `${n}. ${base}`;
}

const REQUIRED_KEYS: LeaderSectionKey[] = [
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

export default function QscLeaderStrategicReportPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const searchParams = useSearchParams();
  const tid = searchParams?.get("tid") ?? "";
  const debug = (searchParams?.get("debug") ?? "") === "1";
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [payload, setPayload] = useState<QscPayload | null>(null);

  // IMPORTANT: capture a container that includes the background,
  // so html2canvas/pdf sees it.
  const reportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // Leader-specific API route
        const apiUrl = tid
          ? `/api/public/qsc/${encodeURIComponent(token)}/leader?tid=${encodeURIComponent(tid)}`
          : `/api/public/qsc/${encodeURIComponent(token)}/leader`;

        const res = await fetch(apiUrl, { cache: "no-store" });

        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
        }

        const j = (await res.json()) as any;

        if (!res.ok || j?.ok === false) {
          throw new Error(j?.error || `HTTP ${res.status}`);
        }

        if (!j?.results) throw new Error("RESULT_NOT_FOUND");

        // Safety: if someone hits /leader but result is entrepreneur, bounce them
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
            taker: j.taker ?? null,
            templates: j.templates ?? null,
            sections: j.sections ?? null,
            persona: j.persona ?? null,
            __debug: j.__debug ?? null,
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

    // give the browser a tick to ensure fonts/background paint
    await new Promise((r) => setTimeout(r, 50));

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#020617", // force dark background even if grid fails
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

  const result = payload?.results ?? null;
  const profile = payload?.profile ?? null;
  const taker = payload?.taker ?? null;

  const createdAt = result?.created_at ? new Date(result.created_at) : null;
  const takerDisplayName = getFullName(taker);

  const snapshotHref = tid
    ? `/qsc/${encodeURIComponent(token)}?tid=${encodeURIComponent(tid)}`
    : `/qsc/${encodeURIComponent(token)}`;

  // ---------- Content mapping (NEW tables first, legacy fallback second) ----------
  const personaCode = result?.combined_profile_code ?? null;

  const sectionMap = useMemo(() => {
    const map: Partial<Record<LeaderSectionKey, any>> = {};

    // templates (global sections) – introduction/how_to_use should live here
    const templates = (payload?.templates ?? []) as SectionRow[];
    for (const row of templates) {
      if (!row || !row.section_key) continue;
      map[row.section_key] = row.content;
    }

    // persona sections – keyed by persona_code (A1..D5)
    const sections = (payload?.sections ?? []) as SectionRow[];
    for (const row of sections) {
      if (!row || !row.section_key) continue;
      map[row.section_key] = row.content;
    }

    // legacy fallback: persona.sections JSON
    if ((!payload?.templates && !payload?.sections) && payload?.persona?.sections) {
      const legacy = payload.persona.sections as any;
      for (const k of Object.keys(legacy || {})) {
        if ((REQUIRED_KEYS as string[]).includes(k)) {
          map[k as LeaderSectionKey] = legacy[k];
        }
      }
    }

    return map;
  }, [payload?.templates, payload?.sections, payload?.persona]);

  const missingKeys = useMemo(() => {
    return REQUIRED_KEYS.filter((k) => {
      const v = sectionMap[k];
      const t = contentToText(v).trim();
      return !t;
    });
  }, [sectionMap]);

  // ---------- Charts ----------
  const personalityPercRaw = (result?.personality_percentages ?? {}) as PersonalityPercMap;
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
  const effectivePrimaryMindset = result?.primary_mindset ?? ("ORIGIN" as MindsetKey);

  // dynamic headings (suffixes)
  const personalitySuffix = PERSONALITY_LABELS[effectivePrimaryPersonality] || null;

  const mindsetLevelFromProfile =
    typeof profile?.mindset_level === "number" ? profile.mindset_level : null;

  const mindsetSuffix = (() => {
    const label = MINDSET_LABELS[effectivePrimaryMindset] || "Mindset";
    const lvl = mindsetLevelFromProfile;
    return lvl ? `${label} (Level ${lvl})` : label;
  })();

  const combinedSuffix =
    (profile?.profile_label || personaCode || "").trim() || null;

  const personaName =
    profile?.profile_label ||
    (personaCode ? `Quantum Leadership Persona ${personaCode}` : "") ||
    "Your Quantum Leadership Profile";

  // ---------- Loading / Error ----------
  if (loading && !result) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-50">
        <div className="relative">
          <BackgroundGrid />
          <main className="relative z-10 mx-auto max-w-5xl px-4 py-12 space-y-4">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
              Strategic Leadership Report
            </p>
            <h1 className="mt-3 text-3xl font-bold">Preparing your QSC Leader report…</h1>
          </main>
        </div>
      </div>
    );
  }

  if (err || !result) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-50">
        <div className="relative">
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
      </div>
    );
  }

  // ---------- Page ----------
  return (
    <div className="min-h-screen bg-[#020617] text-slate-50">
      {/* Everything inside reportRef so PDF captures background */}
      <div ref={reportRef} className="relative">
        {/* fallback base so it never goes white */}
        <div className="pointer-events-none absolute inset-0 bg-[#020617]" />

        {/* gradient wash */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent" />

        {/* standard grid (visual enhancement) */}
        <div className="pointer-events-none absolute inset-0">
          <BackgroundGrid />
        </div>

        <main className="relative z-10 mx-auto max-w-5xl px-4 py-10 md:py-12 space-y-10">
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
                  For: <span className="font-semibold text-slate-50">{takerDisplayName}</span>
                </p>
              )}

              <p className="text-[15px] text-slate-300 max-w-2xl">
                This report is rendered from{" "}
                <code className="text-slate-100">portal.qsc_leader_report_templates</code>{" "}
                and{" "}
                <code className="text-slate-100">portal.qsc_leader_report_sections</code>
                .
              </p>

              {debug && (
                <div className="text-xs text-slate-400 space-y-1 pt-2">
                  <div>persona_code: {personaCode ?? "null"}</div>
                  <div>test_id: {result.test_id}</div>
                  <div>audience: {result.audience ?? "null"}</div>
                  <div>templates rows: {(payload?.templates ?? []).length}</div>
                  <div>sections rows: {(payload?.sections ?? []).length}</div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 text-xs text-slate-400">
              <button
                onClick={handleDownloadPdf}
                className="inline-flex items-center rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-2 text-xs font-medium text-slate-50 shadow-sm hover:bg-slate-900"
              >
                Download PDF
              </button>

              <Link
                href={snapshotHref}
                className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs font-medium hover:bg-slate-900"
              >
                ← Back to Snapshot
              </Link>

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

          {/* Missing-content banner ONLY in debug mode */}
          {debug && missingKeys.length > 0 && (
            <section className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-6">
              <div className="text-sm font-semibold text-rose-100">
                Missing content for this report
              </div>
              <div className="mt-1 text-xs text-rose-100/80">
                Fix the DB rows. We do not auto-fill defaults.
              </div>
              <ul className="mt-3 list-disc pl-5 text-xs text-rose-100/90 space-y-1">
                {missingKeys.map((k) => (
                  <li key={k}>
                    <code className="text-rose-50">section:{k}</code>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Title / Profile */}
          <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-6 md:p-8 space-y-2">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
              STRATEGIC LEADERSHIP REPORT
            </p>
            <h2 className="text-2xl font-semibold text-slate-50">{personaName}</h2>
          </section>

          {/* Charts + Matrix */}
          <section className="grid gap-6 md:grid-cols-2 items-start">
            <div className="rounded-3xl bg-slate-950/70 text-slate-50 border border-slate-800 p-6 md:p-7 space-y-4">
              <h2 className="text-lg font-semibold text-slate-50">Leadership Frequency Type</h2>
              <p className="text-sm text-slate-300">
                Your energetic style across Fire, Flow, Form and Field in how you lead.
              </p>

              <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center">
                <div className="flex justify-center">
                  <FrequencyDonut data={frequencyDonutData} />
                </div>
                <div className="space-y-3 text-sm text-slate-200">
                  {frequencyDonutData.map((d) => (
                    <div key={d.key} className="flex items-center justify-between gap-3">
                      <span>{d.label}</span>
                      <span className="tabular-nums">{Math.round(d.value)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-slate-950/70 text-slate-50 border border-slate-800 p-6 md:p-7 space-y-4">
              <h2 className="text-lg font-semibold text-slate-50">Leadership Mindset Levels</h2>
              <p className="text-sm text-slate-300">
                Where your focus and energy sit across the 5 growth stages.
              </p>

              <div className="space-y-2 pt-2 text-xs">
                {(["ORIGIN", "MOMENTUM", "VECTOR", "ORBIT", "QUANTUM"] as MindsetKey[]).map(
                  (key) => {
                    const pct = Math.round(mindsetPerc[key] ?? 0);
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-slate-200">
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
                  }
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-6 md:p-8 space-y-4">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
              Leadership Persona Matrix
            </p>
            <h2 className="text-xl font-semibold text-slate-50">
              Where your leadership frequency meets your mindset level
            </h2>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70">
              <QscMatrix
                primaryPersonality={effectivePrimaryPersonality}
                primaryMindset={effectivePrimaryMindset}
              />
            </div>
          </section>

          {/* DOC SECTIONS (EXACT ORDER) */}
          <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-6 md:p-8 space-y-3">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-300">
              INTRODUCTION
            </p>
            {renderDocText(sectionMap.introduction, { debug })}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-6 md:p-8 space-y-3">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-300">
              HOW TO USE THIS REPORT
            </p>
            {renderDocText(sectionMap.how_to_use, { debug })}
          </section>

          <section className="rounded-3xl border border-amber-400/30 bg-amber-500/10 p-6 md:p-8 space-y-3">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-amber-200">
              {sectionCardTitle(1, "Your Quantum Profile Summary", null)}
            </p>
            {renderDocText(sectionMap.quantum_profile_summary, { debug })}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-6 md:p-8 space-y-3">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-300">
              {sectionCardTitle(2, "Your Personality Layer", personalitySuffix)}
            </p>
            {renderDocText(sectionMap.personality_layer, { debug })}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-6 md:p-8 space-y-3">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-300">
              {sectionCardTitle(3, "Your Mindset Layer", mindsetSuffix)}
            </p>
            {renderDocText(sectionMap.mindset_layer, { debug })}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-6 md:p-8 space-y-3">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-300">
              {sectionCardTitle(4, "Your Combined Quantum Pattern", combinedSuffix)}
            </p>
            {renderDocText(sectionMap.combined_quantum_pattern, { debug })}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-6 md:p-8 space-y-3">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-300">
              5. Your Strategic Leadership Priorities
            </p>
            {renderDocText(sectionMap.strategic_leadership_priorities, { debug })}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-6 md:p-8 space-y-3">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-300">
              6. 30 Day Leadership Action Plan
            </p>
            {renderDocText(sectionMap.leadership_action_plan_30_day, { debug })}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-6 md:p-8 space-y-3">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-300">
              7. Your Leadership Roadmap
            </p>
            {renderDocText(sectionMap.leadership_roadmap, { debug })}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-6 md:p-8 space-y-3">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-300">
              8. Communication and Decision Style
            </p>
            {renderDocText(sectionMap.communication_and_decision_style, { debug })}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-6 md:p-8 space-y-3">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-300">
              9. Reflection Prompts
            </p>
            {renderDocText(sectionMap.reflection_prompts, { debug })}
          </section>

          <section className="rounded-3xl border border-amber-400/30 bg-amber-500/10 p-6 md:p-8 space-y-3">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-amber-200">
              10. One Page Quantum Summary
            </p>
            {renderDocText(sectionMap.one_page_quantum_summary, { debug })}
          </section>

          <footer className="pt-4 pb-6 text-xs text-slate-500">
            © {new Date().getFullYear()} MindCanvas — Profiletest.ai
          </footer>
        </main>
      </div>
    </div>
  );
}


