// apps/web/app/qsc/[token]/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { QscMatrix } from "../QscMatrix";
import AppBackground from "@/components/ui/AppBackground";

type Audience = "entrepreneur" | "leader";

type PersonalityKey = "FIRE" | "FLOW" | "FORM" | "FIELD";
type MindsetKey = "ORIGIN" | "MOMENTUM" | "VECTOR" | "ORBIT" | "QUANTUM";

type PersonalityPercMap = Partial<Record<PersonalityKey, number>>;
type MindsetPercMap = Partial<Record<MindsetKey, number>>;

type QscResultsRow = {
  id: string;
  test_id: string;
  token: string;
  taker_id: string | null;
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

type QscPersonaRow = {
  id: string;
  test_id?: string | null;
  profile_code?: string | null;
  profile_label?: string | null;
};

type QscTakerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company: string | null;
  role_title: string | null;
};

type ApiPayload = {
  ok: boolean;
  results?: QscResultsRow;
  profile?: QscProfileRow | null;
  persona?: QscPersonaRow | null;
  taker?: QscTakerRow | null;
  __debug?: any;
  error?: string;
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

function normalisePercent(raw: number | undefined | null): number {
  if (raw == null || !Number.isFinite(raw)) return 0;
  // Handle 0–1 style values (rare)
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
  value: number; // 0–100
};

const FREQUENCY_COLORS: Record<PersonalityKey, string> = {
  FIRE: "#f97316",
  FLOW: "#0ea5e9",
  FORM: "#22c55e",
  FIELD: "#a855f7",
};

function FrequencyDonut({ data }: { data: FrequencyDonutDatum[] }) {
  const total =
    data.reduce((sum, d) => sum + (isFinite(d.value) ? d.value : 0), 0) || 1;

  const radius = 56;
  const strokeWidth = 18;
  const center = 72;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <svg viewBox="0 0 144 144" className="h-36 w-36" aria-hidden="true">
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

      <circle
        cx={center}
        cy={center}
        r={radius - strokeWidth}
        fill="#020617"
      />

      <text
        x={center}
        y={center - 4}
        textAnchor="middle"
        className="text-[9px]"
        fill="#e5e7eb"
      >
        BUYER
      </text>
      <text
        x={center}
        y={center + 10}
        textAnchor="middle"
        className="text-[9px]"
        fill="#e5e7eb"
      >
        SNAPSHOT
      </text>
    </svg>
  );
}

export default function QscSnapshotPage({ params }: { params: { token: string } }) {
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
          ? `/api/public/qsc/${encodeURIComponent(token)}/result?tid=${encodeURIComponent(tid)}`
          : `/api/public/qsc/${encodeURIComponent(token)}/result`;

        const res = await fetch(apiUrl, { cache: "no-store" });

        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
        }

        const j = (await res.json()) as ApiPayload;

        if (!res.ok || j.ok === false) {
          // Important: token ambiguity handling
          if (
            res.status === 409 &&
            String(j?.error || "").includes("AMBIGUOUS_TOKEN_REQUIRES_TID")
          ) {
            throw new Error(
              "This link has multiple results. Please open the report from the portal (or add ?tid=...) so we can load the correct report."
            );
          }
          throw new Error(j?.error || `HTTP ${res.status}`);
        }

        if (!j.results) throw new Error("No QSC results found.");

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
  }, [token, tid]);

  const result = payload?.results ?? null;
  const profile = payload?.profile ?? null;
  const persona = payload?.persona ?? null;
  const taker = payload?.taker ?? null;

  const takerName = getFullName(taker);

  const personalityPerc = useMemo(() => {
    const raw = (result?.personality_percentages ?? {}) as PersonalityPercMap;
    return {
      FIRE: normalisePercent(raw.FIRE ?? 0),
      FLOW: normalisePercent(raw.FLOW ?? 0),
      FORM: normalisePercent(raw.FORM ?? 0),
      FIELD: normalisePercent(raw.FIELD ?? 0),
    } as PersonalityPercMap;
  }, [result]);

  const mindsetPerc = useMemo(() => {
    const raw = (result?.mindset_percentages ?? {}) as MindsetPercMap;
    return {
      ORIGIN: normalisePercent(raw.ORIGIN ?? 0),
      MOMENTUM: normalisePercent(raw.MOMENTUM ?? 0),
      VECTOR: normalisePercent(raw.VECTOR ?? 0),
      ORBIT: normalisePercent(raw.ORBIT ?? 0),
      QUANTUM: normalisePercent(raw.QUANTUM ?? 0),
    } as MindsetPercMap;
  }, [result]);

  const frequencyDonutData: FrequencyDonutDatum[] = useMemo(() => {
    return (["FIRE", "FLOW", "FORM", "FIELD"] as PersonalityKey[]).map((key) => ({
      key,
      label: PERSONALITY_LABELS[key],
      value: personalityPerc[key] ?? 0,
    }));
  }, [personalityPerc]);

  async function downloadPdf() {
    if (!reportRef.current) return;

    const element = reportRef.current;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#020617",
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
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

    pdf.save(`qsc-snapshot-${token}.pdf`);
  }

  // Strategic Growth Report routes (no /strategic route required)
  const strategicPath =
    result?.audience === "leader" ? "leader" : "entrepreneur";

  const strategicHref = tid
    ? `/qsc/${encodeURIComponent(token)}/${strategicPath}?tid=${encodeURIComponent(tid)}`
    : `/qsc/${encodeURIComponent(token)}/${strategicPath}`;

  const extendedHref = tid
    ? `/qsc/${encodeURIComponent(token)}/extended?tid=${encodeURIComponent(tid)}`
    : `/qsc/${encodeURIComponent(token)}/extended`;

  if (loading && !result) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <AppBackground />
        <main className="mx-auto max-w-6xl px-6 py-12 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
            Quantum Source Code
          </p>
          <h1 className="text-3xl font-bold">Loading QSC Snapshot…</h1>
        </main>
      </div>
    );
  }

  if (err || !result) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <AppBackground />
        <main className="mx-auto max-w-6xl px-6 py-12 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
            Quantum Source Code
          </p>
          <h1 className="text-3xl font-bold">Couldn&apos;t load snapshot</h1>

          <pre className="rounded-xl border border-slate-800 bg-slate-950/90 p-3 text-xs text-slate-100 whitespace-pre-wrap">
            {err || "No data"}
          </pre>

          {/* Optional debug */}
          {payload?.__debug && (
            <pre className="rounded-xl border border-slate-800 bg-slate-950/90 p-3 text-[11px] text-slate-400 whitespace-pre-wrap">
              {JSON.stringify(payload.__debug, null, 2)}
            </pre>
          )}
        </main>
      </div>
    );
  }

  const personaLabel =
    (persona?.profile_label || profile?.profile_label || "").trim() ||
    "Your Quantum Profile";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <AppBackground />

      <main ref={reportRef} className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
              Quantum Source Code
            </p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Buyer Persona Snapshot
            </h1>
            <p className="text-sm text-slate-300">
              {takerName ? (
                <>
                  For: <span className="font-semibold text-slate-100">{takerName}</span>
                </>
              ) : (
                <>Snapshot overview</>
              )}
            </p>
            <p className="text-sm text-slate-400">
              Profile: <span className="font-semibold text-slate-200">{personaLabel}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={downloadPdf}
              className="inline-flex items-center rounded-xl border border-slate-600 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-50 hover:bg-slate-800"
            >
              Download PDF
            </button>

            {/* ✅ This replaces the deleted /strategic link */}
            <Link
              href={strategicHref}
              className="inline-flex items-center rounded-xl border border-sky-700/50 bg-sky-950/30 px-4 py-2 text-xs font-semibold text-sky-200 hover:bg-sky-950/50"
            >
              Open Strategic Growth Report →
            </Link>

            {/* Optional: keep extended link if you still use it */}
            <Link
              href={extendedHref}
              className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-50 hover:bg-slate-800"
            >
              Open Extended Snapshot →
            </Link>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 space-y-4">
            <h2 className="text-lg font-semibold">Buyer Frequency</h2>
            <p className="text-sm text-slate-300">
              Your buyer frequency split across Fire, Flow, Form and Field.
            </p>

            <div className="mt-2 grid gap-6 md:grid-cols-[auto_1fr] items-center">
              <div className="flex justify-center">
                <FrequencyDonut data={frequencyDonutData} />
              </div>

              <div className="space-y-2 text-sm">
                {frequencyDonutData.map((d) => (
                  <div key={d.key} className="flex items-center justify-between gap-4">
                    <span className="text-slate-200">{d.label}</span>
                    <span className="tabular-nums text-slate-100">
                      {Math.round(d.value)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 space-y-4">
            <h2 className="text-lg font-semibold">Mindset Levels</h2>
            <p className="text-sm text-slate-300">
              Your distribution across the 5 mindset stages.
            </p>

            <div className="space-y-2 pt-2 text-xs">
              {(Object.keys(MINDSET_LABELS) as MindsetKey[]).map((key) => {
                const pct = Math.round(mindsetPerc[key] ?? 0);
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-300">{MINDSET_LABELS[key]}</span>
                      <span className="tabular-nums text-slate-100">{pct}%</span>
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

        <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Buyer Persona Matrix</h2>
          <p className="text-sm text-slate-300">
            Where your buyer frequency meets your dominant mindset stage.
          </p>

          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70">
            <QscMatrix
              primaryPersonality={result.primary_personality}
              primaryMindset={result.primary_mindset}
            />
          </div>
        </section>

        <footer className="pt-4 text-xs text-slate-500">
          © {new Date().getFullYear()} MindCanvas — Profiletest.ai
        </footer>
      </main>
    </div>
  );
}


