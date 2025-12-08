"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type PersonalityKey = "FIRE" | "FLOW" | "FORM" | "FIELD";
type MindsetKey = "ORIGIN" | "MOMENTUM" | "VECTOR" | "ORBIT" | "QUANTUM";

type PersonalityPercMap = Partial<Record<PersonalityKey, number>>;
type MindsetPercMap = Partial<Record<MindsetKey, number>>;

type QscResultsRow = {
  id: string;
  test_id: string;
  token: string;
  personality_totals: Record<string, number> | null;
  personality_percentages: PersonalityPercMap | null; // 0–100
  mindset_totals: Record<string, number> | null;
  mindset_percentages: MindsetPercMap | null; // 0–100
  primary_personality: PersonalityKey | null;
  secondary_personality: PersonalityKey | null;
  primary_mindset: MindsetKey | null;
  secondary_mindset: MindsetKey | null;
  combined_profile_code: string | null; // e.g. "FIELD_ORBIT"
  qsc_profile_id: string | null;
  audience: "entrepreneur" | "leader" | null; // 👈 NEW
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

type QscPersonaRow = {
  id: string;
  test_id: string;
  personality_code: string | null;
  mindset_level: number | null;
  profile_code: string | null;
  profile_label: string | null;

  show_up_summary: string | null;
  energisers: string | null;
  drains: string | null;
  communication_long: string | null;
  admired_for: string | null;
  stuck_points: string | null;

  one_page_strengths: string | null;
  one_page_risks: string | null;

  combined_strengths: string | null;
  combined_risks: string | null;
  combined_big_lever: string | null;

  emotional_stabilises: string | null;
  emotional_destabilises: string | null;
  emotional_patterns_to_watch: string | null;

  decision_style_long: string | null;
  support_yourself: string | null;

  strategic_priority_1: string | null;
  strategic_priority_2: string | null;
  strategic_priority_3: string | null;
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
  persona: QscPersonaRow | null;
  taker: QscTakerRow | null;
};

type MatrixCell = {
  personality: PersonalityKey;
  mindset: MindsetKey;
  label: string;
  code: string; // e.g. "A1".."D5"
};

type CellCategory = "primary" | "secondary" | "related" | "other";

const PERSONALITIES: { key: PersonalityKey; label: string; code: string }[] = [
  { key: "FIRE", label: "FIRE", code: "A" },
  { key: "FLOW", label: "FLOW", code: "B" },
  { key: "FORM", label: "FORM", code: "C" },
  { key: "FIELD", label: "FIELD", code: "D" },
];

const MINDSETS: { key: MindsetKey; label: string; level: number }[] = [
  { key: "ORIGIN", label: "ORIGIN", level: 1 },
  { key: "MOMENTUM", label: "MOMENTUM", level: 2 },
  { key: "VECTOR", label: "VECTOR", level: 3 },
  { key: "ORBIT", label: "ORBIT", level: 4 },
  { key: "QUANTUM", label: "QUANTUM", level: 5 },
];

function buildMatrix(): MatrixCell[] {
  const cells: MatrixCell[] = [];
  for (const m of MINDSETS) {
    for (const p of PERSONALITIES) {
      const code = `${p.code}${m.level}`;
      const label = `${p.label} ${m.label}`;
      cells.push({ personality: p.key, mindset: m.key, label, code });
    }
  }
  return cells;
}

const MATRIX = buildMatrix();

function classifyCell(result: QscResultsRow | null, cell: MatrixCell): CellCategory {
  if (!result) return "other";

  const combined = (result.combined_profile_code || "").toUpperCase();
  const primaryP = result.primary_personality;
  const secondaryP = result.secondary_personality;
  const primaryM = result.primary_mindset;
  const secondaryM = result.secondary_mindset;

  const cellCombined = `${cell.personality}_${cell.mindset}`.toUpperCase();

  if (combined && cellCombined === combined) return "primary";

  const matchesPrimaryCombo =
    (cell.personality === primaryP && cell.mindset === secondaryM) ||
    (cell.personality === secondaryP && cell.mindset === primaryM);

  if (matchesPrimaryCombo) return "secondary";

  const matchesPersonality =
    cell.personality === primaryP || cell.personality === secondaryP;
  const matchesMindset =
    cell.mindset === primaryM || cell.mindset === secondaryM;

  return matchesPersonality || matchesMindset ? "related" : "other";
}

function categoryClasses(cat: CellCategory): string {
  switch (cat) {
    case "primary":
      return "border-sky-400 bg-sky-500 text-slate-50 shadow-xl shadow-sky-900/60";
    case "secondary":
      return "border-sky-400/80 bg-sky-500/15 text-slate-50 shadow-md shadow-sky-900/40";
    case "related":
      return "border-sky-400/40 bg-sky-500/5 text-slate-100";
    case "other":
    default:
      return "border-slate-700/60 bg-slate-900/70 text-slate-400";
  }
}

function percentLabel(value: number | undefined | null): string {
  const v = typeof value === "number" ? value : 0;
  return `${v.toFixed(1).replace(/\.0$/, "")}%`;
}

function Bar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, isFinite(pct) ? pct : 0));
  const width = `${clamped}%`;
  return (
    <div className="w-full h-2 rounded-full bg-slate-800/90 overflow-hidden">
      <div className="h-2 rounded-full bg-sky-500" style={{ width }} />
    </div>
  );
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

  const radius = 60;
  const strokeWidth = 20;
  const center = 80;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <svg
      viewBox="0 0 160 160"
      className="h-40 w-40 md:h-48 md:w-48"
      aria-hidden="true"
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        stroke="rgba(15,23,42,0.9)"
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      {data.map((d) => {
        const value = isFinite(d.value) ? d.value : 0;
        const fraction = value / total;
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
      <text
        x={center}
        y={center - 4}
        textAnchor="middle"
        className="text-[9px] md:text-[10px]"
        fill="#e5e7eb"
        style={{
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        BUYER
      </text>
      <text
        x={center}
        y={center + 10}
        textAnchor="middle"
        className="text-[9px] md:text-[10px]"
        fill="#e5e7eb"
        style={{
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        FREQUENCY
      </text>
    </svg>
  );
}

export default function QscResultPage({ params }: { params: { token: string } }) {
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
          `/api/public/qsc/${encodeURIComponent(token)}/result`,
          { cache: "no-store" }
        );

        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(
            `Non-JSON response (${res.status}): ${text.slice(0, 200)}`
          );
        }

        const j = (await res.json()) as
          | ({ ok?: boolean; error?: string } & {
              results?: QscResultsRow;
              profile?: QscProfileRow | null;
              persona?: QscPersonaRow | null;
              taker?: QscTakerRow | null;
            })
          | { ok?: boolean; error?: string };

        if (!res.ok || (j as any).ok === false) {
          throw new Error((j as any).error || `HTTP ${res.status}`);
        }

        const cast = j as any;
        if (alive && cast.results) {
          setPayload({
            results: cast.results,
            profile: cast.profile ?? null,
            persona: cast.persona ?? null,
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
  }, [token]);

  const result = payload?.results ?? null;
  const profile = payload?.profile ?? null;
  const persona = payload?.persona ?? null;
  const taker = payload?.taker ?? null;

  const personalityPerc = useMemo<PersonalityPercMap>(
    () => result?.personality_percentages || {},
    [result]
  );
  const mindsetPerc = useMemo<MindsetPercMap>(
    () => result?.mindset_percentages || {},
    [result]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <main className="mx-auto max-w-5xl px-4 py-12">
          <p className="text-sm font-semibold tracking-[0.25em] uppercase text-sky-300/80">
            Quantum Source Code
          </p>
          <h1 className="mt-3 text-3xl font-bold">Loading your results…</h1>
        </main>
      </div>
    );
  }

  if (err || !result) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <main className="mx-auto max-w-5xl px-4 py-12 space-y-4">
          <p className="text-sm font-semibold tracking-[0.25em] uppercase text-sky-300/80">
            Quantum Source Code
          </p>
          <h1 className="text-3xl font-bold">Something went wrong</h1>
          <p className="text-sm text-slate-300">
            We couldn&apos;t load your Quantum Source Code result.
          </p>
          <pre className="mt-2 rounded-xl border border-slate-800 bg-slate-950/90 p-3 text-xs text-slate-100 whitespace-pre-wrap">
            {err || "No data"}
          </pre>
          <p className="text-xs text-slate-500">
            Debug endpoint:{" "}
            <code className="break-all">
              /api/public/qsc/{token}/result
            </code>
          </p>
        </main>
      </div>
    );
  }

  const primaryPersonaLabel =
    persona?.profile_label || profile?.profile_label || "Combined profile";
  const createdAt = new Date(result.created_at);

  const takerDisplayName =
    taker &&
    ([taker.first_name, taker.last_name].filter(Boolean).join(" ") ||
      taker.email ||
      null);

  const frequencyDonutData: FrequencyDonutDatum[] = PERSONALITIES.map((p) => ({
    key: p.key,
    label: p.label,
    value: personalityPerc[p.key] ?? 0,
  }));

  // 👇 decide which extended report to use
  const audience: "entrepreneur" | "leader" =
    (result.audience as "entrepreneur" | "leader" | null) || "entrepreneur";

  const baseExtendedPath =
    audience === "leader"
      ? `/qsc/${encodeURIComponent(token)}/leader`
      : `/qsc/${encodeURIComponent(token)}/entrepreneur`;

  const extendedReportHref = tid
    ? `${baseExtendedPath}?tid=${encodeURIComponent(tid)}`
    : baseExtendedPath;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <main className="mx-auto max-w-6xl px-4 py-10 md:py-12 space-y-10">
        {/* Snapshot header */}
        <section className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
                Quantum Source Code
              </p>
              <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
                Your Buyer Persona Snapshot
              </h1>
              {takerDisplayName && (
                <p className="mt-1 text-sm text-slate-300">
                  For:{" "}
                  <span className="font-semibold text-slate-50">
                    {takerDisplayName}
                  </span>
                </p>
              )}
              <p className="mt-2 text-sm text-slate-300 max-w-2xl">
                This view combines your{" "}
                <span className="font-semibold">Buyer Frequency Type</span> and{" "}
                <span className="font-semibold">Buyer Mindset Level</span> into
                one Quantum Source Code profile.
              </p>
            </div>

            <div className="flex md:items-end">
              <Link
                href={extendedReportHref}
                className="inline-flex items-center rounded-xl border border-sky-500/70 bg-sky-600/80 px-4 py-2 text-sm font-medium text-slate-50 shadow-md shadow-sky-900/60 hover:bg-sky-500 hover:border-sky-400 transition"
              >
                {audience === "leader"
                  ? "View Strategic Leadership Report →"
                  : "View Strategic Growth Report →"}
              </Link>
            </div>
          </div>

          {/* (rest of your snapshot layout – unchanged) */}

          {/* ... keep all the existing sections below this line as they are ... */}

        </section>

        <footer className="pt-4 text-xs text-slate-500">
          © {new Date().getFullYear()} MindCanvas — Profiletest.ai
        </footer>
      </main>
    </div>
  );
}




