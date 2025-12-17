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
  secondary_personality: PersonalityKey | null;
  primary_mindset: MindsetKey | null;
  secondary_mindset: MindsetKey | null;

  combined_profile_code: string | null;
  qsc_profile_id: string | null;
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

type TemplateRow = {
  id: string;
  test_id: string;
  section_key: string; // introduction, how_to_use
  content: any; // jsonb
  sort_order: number;
  is_active: boolean;
};

type SectionRow = {
  id: string;
  test_id: string;
  persona_code: string; // A1..D5
  section_key: string;
  content: any; // jsonb
  sort_order: number;
  is_active: boolean;
};

type ApiPayload = {
  results: QscResultsRow;
  profile: QscProfileRow | null;
  taker: QscTakerRow | null;
  templates: TemplateRow[];
  sections: SectionRow[];
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

/**
 * Robust: supports content stored as:
 * - jsonb object: { text: "..." }
 * - string: "..."
 * - stringified JSON: "{\"text\":\"...\"}"
 */
function contentToText(content: any): string {
  if (content == null) return "";

  // If the DB column is jsonb (Supabase returns object)
  if (typeof content === "object") {
    if (typeof content.text === "string") return content.text;
    // allow other shapes later
    return "";
  }

  // If it is plain string
  if (typeof content === "string") {
    const s = content.trim();
    if (!s) return "";

    // Try parse stringified JSON
    if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
      try {
        const parsed = JSON.parse(s);
        if (parsed && typeof parsed === "object" && typeof parsed.text === "string") {
          return parsed.text;
        }
      } catch {
        // fall through
      }
    }

    return s;
  }

  return "";
}

function renderDocText(content: any) {
  const t = contentToText(content).trim();

  if (!t) {
    return (
      <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
        <div className="font-semibold">Missing content</div>
        <div className="mt-1 text-xs text-rose-100/80">
          This section is blank for this report (template/section row missing or empty).
        </div>
      </div>
    );
  }

  return (
    <div className="text-[15px] text-slate-100/90 whitespace-pre-line leading-relaxed">
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

      <text x={center} y={center - 4} textAnchor="middle" fill="#e5e7eb" className="text-[9px] md:text-[10px]">
        LEADERSHIP
      </text>
      <text x={center} y={center + 12} textAnchor="middle" fill="#e5e7eb" className="text-[9px] md:text-[10px]">
        FREQUENCY
      </text>
    </svg>
  );
}

function SectionCard({
  kicker,
  title,
  content,
  variant = "dark",
}: {
  kicker: string;
  title: string;
  content: any;
  variant?: "dark" | "accentA" | "accentB";
}) {
  const base =
    "rounded-3xl border p-6 md:p-8 shadow-sm backdrop-blur-sm";

  const variants: Record<typeof variant, string> = {
    // Default dark card (keeps readability even if background changes)
    dark:
      "border-slate-800 bg-slate-950/60",
    // Subtle “entrepreneur-like” lift but STILL dark and readable
    accentA:
      "border-amber-400/25 bg-gradient-to-br from-slate-950/70 via-slate-950/55 to-amber-500/10",
    accentB:
      "border-sky-400/25 bg-gradient-to-br from-slate-950/70 via-slate-950/55 to-sky-500/10",
  };

  return (
    <section className={`${base} ${variants[variant]} space-y-2`}>
      <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-300/80">
        {kicker}
      </p>
      <h3 className="text-xl font-semibold text-slate-50">{title}</h3>
      <div className="pt-2">{renderDocText(content)}</div>
    </section>
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
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [payload, setPayload] = useState<ApiPayload | null>(null);

  const reportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

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

        if (!res.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${res.status}`);
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
            templates: Array.isArray(j.templates) ? j.templates : [],
            sections: Array.isArray(j.sections) ? j.sections : [],
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

    // IMPORTANT: capture at higher scale; BackgroundGrid is behind cards
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: null, // keep transparent so gradient/cards remain true
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

  const takerDisplayName = getFullName(taker);

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
    (profile?.profile_label || "").trim() ||
    (result?.combined_profile_code || "").trim() ||
    "Your Quantum Leadership Profile";

  const createdAt = result?.created_at ? new Date(result.created_at) : null;

  const snapshotHref = tid
    ? `/qsc/${encodeURIComponent(token)}?tid=${encodeURIComponent(tid)}`
    : `/qsc/${encodeURIComponent(token)}`;

  // Build lookups from DB tables
  const templateByKey = useMemo(() => {
    const m: Record<string, TemplateRow> = {};
    (payload?.templates ?? []).forEach((r) => {
      m[String(r.section_key || "").trim()] = r;
    });
    return m;
  }, [payload?.templates]);

  const sectionByKey = useMemo(() => {
    const m: Record<string, SectionRow> = {};
    (payload?.sections ?? []).forEach((r) => {
      m[String(r.section_key || "").trim()] = r;
    });
    return m;
  }, [payload?.sections]);

  const missing = useMemo(() => {
    const reqTemplates = ["introduction", "how_to_use"];
    const reqSections = [
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

    const misses: string[] = [];

    reqTemplates.forEach((k) => {
      const row = templateByKey[k];
      const text = contentToText(row?.content).trim();
      if (!text) misses.push(`template:${k}`);
    });

    reqSections.forEach((k) => {
      const row = sectionByKey[k];
      const text = contentToText(row?.content).trim();
      if (!text) misses.push(`section:${k}`);
    });

    return misses;
  }, [templateByKey, sectionByKey]);

  if (loading && !result) {
    return (
      <div className="relative min-h-screen text-slate-50">
        <BackgroundGrid />
        <main className="relative z-10 mx-auto max-w-5xl px-4 py-12 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
            Strategic Leadership Report
          </p>
          <h1 className="mt-3 text-3xl font-bold">Preparing your QSC Leader report…</h1>
        </main>
      </div>
    );
  }

  if (err || !result) {
    return (
      <div className="relative min-h-screen text-slate-50">
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
            <Link
              href={snapshotHref}
              className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs font-medium hover:bg-slate-900"
            >
              ← Back to Snapshot
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-slate-50">
      {/* ✅ Background must sit behind content */}
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
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-50">
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
              <code className="text-slate-100">portal.qsc_leader_report_sections</code>.
            </p>
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

        {missing.length > 0 && (
          <section className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-6">
            <div className="text-sm font-semibold text-rose-100">
              Missing content for this report
            </div>
            <div className="mt-1 text-xs text-rose-100/80">
              Fix the DB rows (we do not auto-fill defaults).
            </div>
            <ul className="mt-3 list-disc pl-5 text-xs text-rose-100/90 space-y-1">
              {missing.map((k) => (
                <li key={k}>
                  <code className="text-rose-50">{k}</code>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Title / Profile (keeps dark readability but adds a little lift) */}
        <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950/70 via-slate-950/55 to-sky-500/10 p-6 md:p-8 shadow-sm backdrop-blur-sm space-y-2">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
            STRATEGIC LEADERSHIP REPORT
          </p>
          <h2 className="text-2xl font-semibold text-slate-50">{personaName}</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-200/80">
            <span className="rounded-full border border-slate-700 bg-slate-950/60 px-2 py-1">
              Primary: {PERSONALITY_LABELS[effectivePrimaryPersonality] || effectivePrimaryPersonality}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-950/60 px-2 py-1">
              Mindset: {MINDSET_LABELS[effectivePrimaryMindset] || effectivePrimaryMindset}
              {typeof profile?.mindset_level === "number" ? ` (Level ${profile.mindset_level})` : ""}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-950/60 px-2 py-1">
              Persona: {(payload?.__debug?.persona_code || "").toString()}
            </span>
          </div>
        </section>

        {/* Charts */}
        <section className="grid gap-6 md:grid-cols-2 items-start">
          <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 md:p-7 shadow-sm backdrop-blur-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-50">Leadership Frequency Type</h2>
            <p className="text-sm text-slate-300">
              Your energetic style across Fire, Flow, Form and Field in how you lead.
            </p>

            <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center">
              <div className="flex justify-center">
                <FrequencyDonut data={frequencyDonutData} />
              </div>
              <div className="space-y-3 text-sm">
                {frequencyDonutData.map((d) => (
                  <div key={d.key} className="flex items-center justify-between gap-3">
                    <span className="text-slate-200">{d.label}</span>
                    <span className="tabular-nums text-slate-100">{Math.round(d.value)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 md:p-7 shadow-sm backdrop-blur-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-50">Leadership Mindset Levels</h2>
            <p className="text-sm text-slate-300">
              Where your focus and energy sit across the 5 growth stages.
            </p>

            <div className="space-y-2 pt-2 text-xs">
              {( ["ORIGIN", "MOMENTUM", "VECTOR", "ORBIT", "QUANTUM"] as MindsetKey[] ).map((key) => {
                const pct = Math.round(mindsetPerc[key] ?? 0);
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-slate-200">
                      <span>{MINDSET_LABELS[key]}</span>
                      <span className="tabular-nums text-slate-100">{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-900/70">
                      <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </section>

        {/* Matrix */}
        <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-6 md:p-8 shadow-sm backdrop-blur-sm space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
            Leadership Persona Matrix
          </p>
          <h2 className="text-xl font-semibold text-slate-50">
            Where your frequency meets your mindset
          </h2>
          <p className="text-sm text-slate-300">
            Your primary pattern is highlighted — the intersection where your leadership identity meets your maturity stage.
          </p>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70">
            <QscMatrix
              primaryPersonality={effectivePrimaryPersonality}
              primaryMindset={effectivePrimaryMindset}
            />
          </div>
        </section>

        {/* ✅ INTRO + HOW TO USE (side-by-side as you requested) */}
        <section className="grid gap-6 md:grid-cols-2">
          <SectionCard
            kicker="INTRODUCTION"
            title="Why this report matters"
            content={templateByKey["introduction"]?.content}
            variant="dark"
          />
          <SectionCard
            kicker="HOW TO USE THIS REPORT"
            title="How to get value fast"
            content={templateByKey["how_to_use"]?.content}
            variant="dark"
          />
        </section>

        {/* Persona sections (exact keys) */}
        <SectionCard
          kicker="1. YOUR QUANTUM PROFILE SUMMARY"
          title="Your at-a-glance leadership identity"
          content={sectionByKey["quantum_profile_summary"]?.content}
          variant="accentA"
        />

        <SectionCard
          kicker="2. YOUR PERSONALITY LAYER"
          title="How you show up emotionally & behaviourally"
          content={sectionByKey["personality_layer"]?.content}
          variant="dark"
        />

        <SectionCard
          kicker="3. YOUR MINDSET LAYER"
          title="What your stage demands now"
          content={sectionByKey["mindset_layer"]?.content}
          variant="dark"
        />

        <SectionCard
          kicker="4. YOUR COMBINED QUANTUM PATTERN"
          title="What happens when your style meets your stage"
          content={sectionByKey["combined_quantum_pattern"]?.content}
          variant="dark"
        />

        <SectionCard
          kicker="5. YOUR STRATEGIC LEADERSHIP PRIORITIES"
          title="What to focus on next"
          content={sectionByKey["strategic_leadership_priorities"]?.content}
          variant="accentB"
        />

        <SectionCard
          kicker="6. 30 DAY LEADERSHIP ACTION PLAN"
          title="A practical 4-week plan"
          content={sectionByKey["leadership_action_plan_30_day"]?.content}
          variant="accentA"
        />

        <SectionCard
          kicker="7. YOUR LEADERSHIP ROADMAP"
          title="Your longer-term path"
          content={sectionByKey["leadership_roadmap"]?.content}
          variant="dark"
        />

        <SectionCard
          kicker="8. COMMUNICATION AND DECISION STYLE"
          title="How you process, decide and move"
          content={sectionByKey["communication_and_decision_style"]?.content}
          variant="accentB"
        />

        <SectionCard
          kicker="9. REFLECTION PROMPTS"
          title="Questions to keep you honest"
          content={sectionByKey["reflection_prompts"]?.content}
          variant="dark"
        />

        <SectionCard
          kicker="10. ONE PAGE QUANTUM SUMMARY"
          title="Your quick reference snapshot"
          content={sectionByKey["one_page_quantum_summary"]?.content}
          variant="accentA"
        />

        <footer className="pt-4 pb-6 text-xs text-slate-400">
          © {new Date().getFullYear()} MindCanvas — Profiletest.ai
        </footer>

        {/* Debug (kept but subtle) */}
        {payload?.__debug && (
          <section className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4 text-xs text-slate-300 whitespace-pre-wrap">
            <div className="mb-2 font-semibold text-slate-200">Debug</div>
            {JSON.stringify(payload.__debug, null, 2)}
          </section>
        )}
      </main>
    </div>
  );
}


