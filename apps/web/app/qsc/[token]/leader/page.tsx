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
  taker_id?: string | null;
  audience: Audience | null;

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
};

type QscTakerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company: string | null;
  role_title: string | null;
};

type SectionKey =
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

type TemplateRow = {
  id: string;
  test_id: string;
  section_key: SectionKey;
  content: any;
  sort_order: number | null;
  is_active?: boolean | null;
};

type SectionRow = {
  id: string;
  test_id: string;
  persona_code: string;
  section_key: SectionKey;
  content: any;
  sort_order: number | null;
  is_active?: boolean | null;
};

type ApiPayload = {
  ok: boolean;
  results: QscResultsRow;
  profile: QscProfileRow | null;
  taker: QscTakerRow | null;

  // new tables
  persona_code?: string | null;
  templates?: TemplateRow[];
  sections?: SectionRow[];

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

function contentToText(content: any): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (typeof content === "number" || typeof content === "boolean") return String(content);

  // common shape: { text: "..." }
  if (typeof content === "object" && typeof content.text === "string") return content.text;

  // occasionally: { value: { text: "..." } }
  if (typeof content === "object" && content.value && typeof content.value.text === "string")
    return content.value.text;

  // fallback: stringify safely
  try {
    return JSON.stringify(content, null, 2);
  } catch {
    return String(content);
  }
}

function isBlankContent(content: any): boolean {
  const t = contentToText(content).trim();
  return t.length === 0;
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
  const strokeWidth = 18;
  const center = 80;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <svg viewBox="0 0 160 160" className="h-40 w-40 md:h-44 md:w-44" aria-hidden="true">
      <circle
        cx={center}
        cy={center}
        r={radius}
        stroke="rgba(15,23,42,0.95)"
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

      <text x={center} y={center - 5} textAnchor="middle" fill="#e5e7eb" className="text-[10px]">
        LEADERSHIP
      </text>
      <text x={center} y={center + 10} textAnchor="middle" fill="#e5e7eb" className="text-[10px]">
        FREQUENCY
      </text>
    </svg>
  );
}

function GlowCard({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "amber" | "sky" | "indigo" | "rose" | "emerald";
}) {
  const toneMap: Record<string, string> = {
    slate: "border-slate-800 bg-slate-950/55",
    amber: "border-amber-400/25 bg-amber-500/10",
    sky: "border-sky-400/25 bg-sky-500/10",
    indigo: "border-indigo-400/25 bg-indigo-500/10",
    rose: "border-rose-400/25 bg-rose-500/10",
    emerald: "border-emerald-400/25 bg-emerald-500/10",
  };

  return (
    <section className={`relative overflow-hidden rounded-3xl border shadow-[0_20px_80px_rgba(0,0,0,0.35)] ${toneMap[tone]}`}>
      {/* subtle inner glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.14),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.10),transparent_45%),radial-gradient(circle_at_30%_90%,rgba(34,197,94,0.08),transparent_45%)]" />
      <div className="relative p-6 md:p-8">{children}</div>
    </section>
  );
}

function SectionHeader({
  kicker,
  title,
  subtitle,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-2">
      {kicker && (
        <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-sky-300/85">
          {kicker}
        </p>
      )}
      <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-50">
        {title}
      </h2>
      {subtitle && <p className="text-[15px] text-slate-300 leading-relaxed">{subtitle}</p>}
    </div>
  );
}

function DocText({ content }: { content: any }) {
  const t = contentToText(content).trim();

  if (!t) {
    // Keep this: it’s how you *see immediately* if DB mapping breaks.
    return (
      <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-100">
        <div className="font-semibold">Missing content</div>
        <div className="mt-1 text-xs text-rose-100/80">
          This section is blank in the database for this report.
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

function buildSectionMap(rows: Array<{ section_key: SectionKey; content: any }> | undefined | null) {
  const map = new Map<SectionKey, any>();
  (rows || []).forEach((r) => map.set(r.section_key, r.content));
  return map;
}

function requiredKeys(): SectionKey[] {
  return [
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

        const j = (await res.json()) as ApiPayload;

        if (!res.ok || j?.ok === false) throw new Error((j as any)?.error || `HTTP ${res.status}`);
        if (!j?.results) throw new Error("RESULT_NOT_FOUND");

        // Safety bounce
        if (j.results.audience === "entrepreneur") {
          const base = `/qsc/${encodeURIComponent(token)}/entrepreneur`;
          const href = tid ? `${base}?tid=${encodeURIComponent(tid)}` : base;
          router.replace(href);
          return;
        }

        if (alive) setPayload(j);
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
      backgroundColor: null, // keep your background rendering consistent
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

  const personaCode = payload?.persona_code ?? result?.combined_profile_code ?? null;

  const templateMap = useMemo(() => buildSectionMap(payload?.templates ?? []), [payload?.templates]);
  const sectionMap = useMemo(() => buildSectionMap(payload?.sections ?? []), [payload?.sections]);

  const introContent = templateMap.get("introduction") ?? null;
  const howToUseContent = templateMap.get("how_to_use") ?? null;

  const sectionContent = (k: SectionKey) => sectionMap.get(k) ?? null;

  const misses = useMemo(() => {
    const missing: string[] = [];
    const all = requiredKeys();
    for (const k of all) {
      const src = k === "introduction" || k === "how_to_use" ? templateMap.get(k) : sectionMap.get(k);
      if (isBlankContent(src)) missing.push(`section:${k}`);
    }
    return missing;
  }, [templateMap, sectionMap]);

  const takerDisplayName = getFullName(taker);

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

  const personaName =
    (profile?.profile_label || "").trim() ||
    (personaCode || "").replace(/_/g, " ").trim() ||
    "Your Quantum Leadership Profile";

  const createdAt = result?.created_at ? new Date(result.created_at) : null;

  const snapshotHref = tid
    ? `/qsc/${encodeURIComponent(token)}?tid=${encodeURIComponent(tid)}`
    : `/qsc/${encodeURIComponent(token)}`;

  if (loading && !result) {
    return (
      <div className="relative min-h-screen text-slate-50">
        <BackgroundGrid />
        <main className="relative z-10 mx-auto max-w-6xl px-4 py-12 space-y-4">
          <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-sky-300/85">
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
        <main className="relative z-10 mx-auto max-w-6xl px-4 py-12 space-y-4">
          <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-sky-300/85">
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
      <BackgroundGrid />

      <main
        ref={reportRef}
        className="relative z-10 mx-auto max-w-6xl px-4 py-10 md:py-12 space-y-10"
      >
        {/* Top Header */}
        <header className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-sky-300/85">
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

        {/* Missing content warning (kept but less “in your face”) */}
        {misses.length > 0 && (
          <section className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6">
            <div className="text-sm font-semibold text-rose-100">
              Missing content for this report (persona:{" "}
              <span className="font-mono">{personaCode ?? "unknown"}</span>)
            </div>
            <div className="mt-1 text-xs text-rose-100/80">
              This is a DB alignment check — it helps you spot missing keys fast.
            </div>
            <ul className="mt-3 list-disc pl-5 text-xs text-rose-100/90 space-y-1">
              {misses.map((k) => (
                <li key={k}>
                  <code className="text-rose-50">{k}</code>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Hero / Profile Banner (more “alive”) */}
        <GlowCard tone="sky">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-sky-200/80">
                Strategic Leadership Report
              </p>
              <h2 className="text-2xl md:text-3xl font-semibold text-slate-50">
                {personaName}
              </h2>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1 text-xs text-slate-200">
                  Primary: {PERSONALITY_LABELS[effectivePrimaryPersonality]}
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1 text-xs text-slate-200">
                  Mindset: {MINDSET_LABELS[effectivePrimaryMindset]}
                  {typeof profile?.mindset_level === "number" ? ` (Level ${profile.mindset_level})` : ""}
                </span>
                {personaCode && (
                  <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1 text-xs text-slate-200">
                    Persona: <span className="ml-1 font-mono">{personaCode}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="hidden md:block">
              <div className="h-16 w-16 rounded-2xl border border-slate-800 bg-slate-950/50 shadow-[0_20px_80px_rgba(0,0,0,0.35)]" />
            </div>
          </div>
        </GlowCard>

        {/* Intro + How-to-use (SIDE BY SIDE) */}
        <section className="grid gap-6 md:grid-cols-2">
          <GlowCard tone="slate">
            <SectionHeader kicker="Introduction" title="Why this report matters" />
            <div className="mt-4">
              <DocText content={introContent} />
            </div>
          </GlowCard>

          <GlowCard tone="slate">
            <SectionHeader kicker="How to use this report" title="How to get value fast" />
            <div className="mt-4">
              <DocText content={howToUseContent} />
            </div>
          </GlowCard>
        </section>

        {/* Charts */}
        <section className="grid gap-6 md:grid-cols-2 items-start">
          <GlowCard tone="indigo">
            <SectionHeader
              kicker="Leadership Frequency Type"
              title="Your energetic leadership style"
              subtitle="Your pattern across Fire, Flow, Form and Field — how you lead, decide and influence."
            />

            <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center">
              <div className="flex justify-center">
                <FrequencyDonut data={frequencyDonutData} />
              </div>

              <div className="space-y-3 text-sm">
                {frequencyDonutData.map((d) => (
                  <div key={d.key} className="flex items-center justify-between gap-3">
                    <span className="text-slate-200">{d.label}</span>
                    <span className="tabular-nums text-slate-50">{Math.round(d.value)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </GlowCard>

          <GlowCard tone="emerald">
            <SectionHeader
              kicker="Leadership Mindset Levels"
              title="Where your focus and energy sit"
              subtitle="Your distribution across the 5 growth stages — and what that implies for leadership decisions."
            />

            <div className="mt-6 space-y-3">
              {(["ORIGIN", "MOMENTUM", "VECTOR", "ORBIT", "QUANTUM"] as MindsetKey[]).map((key) => {
                const pct = Math.round(mindsetPerc[key] ?? 0);
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-200">{MINDSET_LABELS[key]}</span>
                      <span className="tabular-nums text-slate-50">{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-900/80">
                      <div
                        className="h-2 rounded-full bg-emerald-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </GlowCard>
        </section>

        {/* Matrix */}
        <GlowCard tone="slate">
          <SectionHeader
            kicker="Leadership Persona Matrix"
            title="Where your frequency meets your mindset"
            subtitle="Your primary pattern is highlighted — this is the intersection where your leadership identity meets your maturity stage."
          />
          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
            <QscMatrix
              primaryPersonality={effectivePrimaryPersonality}
              primaryMindset={effectivePrimaryMindset}
            />
          </div>
        </GlowCard>

        {/* Report Sections */}
        <GlowCard tone="amber">
          <SectionHeader
            kicker="1. Your Quantum Profile Summary"
            title="Your at-a-glance leadership identity"
            subtitle="This sets the foundation for the rest of the report."
          />
          <div className="mt-5">
            <DocText content={sectionContent("quantum_profile_summary")} />
          </div>
        </GlowCard>

        <GlowCard tone="indigo">
          <SectionHeader
            kicker="2. Your Personality Layer"
            title="How you show up emotionally & behaviourally"
          />
          <div className="mt-5">
            <DocText content={sectionContent("personality_layer")} />
          </div>
        </GlowCard>

        <GlowCard tone="emerald">
          <SectionHeader
            kicker="3. Your Mindset Layer"
            title="What your stage demands now"
          />
          <div className="mt-5">
            <DocText content={sectionContent("mindset_layer")} />
          </div>
        </GlowCard>

        <GlowCard tone="slate">
          <SectionHeader
            kicker="4. Your Combined Quantum Pattern"
            title="What happens when your style meets your stage"
          />
          <div className="mt-5">
            <DocText content={sectionContent("combined_quantum_pattern")} />
          </div>
        </GlowCard>

        <GlowCard tone="sky">
          <SectionHeader
            kicker="5. Your Strategic Leadership Priorities"
            title="What to focus on next"
          />
          <div className="mt-5">
            <DocText content={sectionContent("strategic_leadership_priorities")} />
          </div>
        </GlowCard>

        <GlowCard tone="rose">
          <SectionHeader
            kicker="6. 30 Day Leadership Action Plan"
            title="A practical 4-week plan"
          />
          <div className="mt-5">
            <DocText content={sectionContent("leadership_action_plan_30_day")} />
          </div>
        </GlowCard>

        <GlowCard tone="slate">
          <SectionHeader
            kicker="7. Your Leadership Roadmap"
            title="Your longer-term path"
          />
          <div className="mt-5">
            <DocText content={sectionContent("leadership_roadmap")} />
          </div>
        </GlowCard>

        <GlowCard tone="indigo">
          <SectionHeader
            kicker="8. Communication and Decision Style"
            title="How you process, decide and move"
          />
          <div className="mt-5">
            <DocText content={sectionContent("communication_and_decision_style")} />
          </div>
        </GlowCard>

        <GlowCard tone="emerald">
          <SectionHeader
            kicker="9. Reflection Prompts"
            title="Questions to keep you honest"
          />
          <div className="mt-5">
            <DocText content={sectionContent("reflection_prompts")} />
          </div>
        </GlowCard>

        <GlowCard tone="amber">
          <SectionHeader
            kicker="10. One Page Quantum Summary"
            title="Your quick reference snapshot"
          />
          <div className="mt-5">
            <DocText content={sectionContent("one_page_quantum_summary")} />
          </div>
        </GlowCard>

        <footer className="pt-4 pb-6 text-xs text-slate-500">
          © {new Date().getFullYear()} MindCanvas — Profiletest.ai
        </footer>

        {/* Debug block (kept small; remove anytime) */}
        {payload?.__debug && (
          <details className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-300">
            <summary className="cursor-pointer text-slate-200 font-medium">
              Debug
            </summary>
            <pre className="mt-3 whitespace-pre-wrap">
              {JSON.stringify(payload.__debug, null, 2)}
            </pre>
          </details>
        )}
      </main>
    </div>
  );
}

