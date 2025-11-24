"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip as PieTooltip,
  ResponsiveContainer as PieResponsive,
} from "recharts";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as BarTooltip,
  ResponsiveContainer as BarResponsive,
} from "recharts";

type PersonalityKey = "FIRE" | "FLOW" | "FORM" | "FIELD";
type MindsetKey = "ORIGIN" | "MOMENTUM" | "VECTOR" | "ORBIT" | "QUANTUM";

type QscResults = {
  id: string;
  test_id: string;
  token: string;
  personality_totals: Record<string, number> | null;
  personality_percentages: Record<string, number> | null;
  mindset_totals: Record<string, number> | null;
  mindset_percentages: Record<string, number> | null;
  primary_personality: PersonalityKey;
  secondary_personality: PersonalityKey | null;
  primary_mindset: MindsetKey;
  secondary_mindset: MindsetKey | null;
  combined_profile_code: string;
  qsc_profile_id: string | null;
  created_at: string;
};

type QscProfile = {
  id: string;
  personality_code: string; // "A" | "B" | "C" | "D"
  mindset_level: number; // 1..5
  profile_code: string; // "A5" etc
  profile_label: string; // "Fire Quantum"
  how_to_communicate: string | null;
  decision_style: string | null;
  business_challenges: string | null;
  trust_signals: string | null;
  offer_fit: string | null;
  sale_blockers: string | null;
  created_at: string;
};

type TipTapNode = {
  type: string;
  text?: string;
  attrs?: { level?: number };
  content?: TipTapNode[];
};

type ReportSection = {
  id: string;
  section_key: string;
  title: string | null;
  content: any | null; // TipTap JSON
  persona_code: string | null;
  order_index: number | null;
  is_active: boolean | null;
};

type ApiResponse = {
  ok: boolean;
  results?: QscResults;
  profile?: QscProfile | null;
  sections?: ReportSection[];
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

const PERSONALITY_COLORS: Record<PersonalityKey, string> = {
  FIRE: "#f97316", // orange
  FLOW: "#38bdf8", // sky
  FORM: "#a855f7", // purple
  FIELD: "#22c55e", // green
};

const MINDSET_COLORS: Record<MindsetKey, string> = {
  ORIGIN: "#6366f1",
  MOMENTUM: "#22c55e",
  VECTOR: "#f97316",
  ORBIT: "#0ea5e9",
  QUANTUM: "#e11d48",
};

/**
 * Very small TipTap renderer for:
 * - heading
 * - paragraph
 * - bulletList / listItem
 * - text
 */
function renderTipTap(node: TipTapNode, key?: number | string): JSX.Element | null {
  if (!node) return null;

  switch (node.type) {
    case "doc":
      return (
        <div key={key} className="space-y-4">
          {(node.content || []).map((child, idx) => renderTipTap(child, idx))}
        </div>
      );

    case "heading": {
      const level = node.attrs?.level ?? 2;
      const children = (node.content || []).map((c, idx) => renderTipTap(c, idx));
      const common = "font-semibold text-slate-50";
      if (level === 1) {
        return (
          <h2 key={key} className={`text-2xl md:text-3xl ${common}`}>
            {children}
          </h2>
        );
      }
      if (level === 2) {
        return (
          <h3 key={key} className={`text-xl md:text-2xl ${common}`}>
            {children}
          </h3>
        );
      }
      return (
        <h4 key={key} className={`text-lg ${common}`}>
          {children}
        </h4>
      );
    }

    case "paragraph": {
      const children = (node.content || []).map((c, idx) => renderTipTap(c, idx));
      return (
        <p key={key} className="text-sm md:text-base text-slate-200 leading-relaxed">
          {children}
        </p>
      );
    }

    case "bulletList": {
      return (
        <ul key={key} className="list-disc list-inside space-y-1 text-sm md:text-base text-slate-200">
          {(node.content || []).map((c, idx) => renderTipTap(c, idx))}
        </ul>
      );
    }

    case "listItem": {
      const children = (node.content || []).map((c, idx) => renderTipTap(c, idx));
      return <li key={key}>{children}</li>;
    }

    case "text":
      return (
        <span key={key}>
          {node.text}
        </span>
      );

    default:
      return null;
  }
}

function renderSection(section: ReportSection) {
  if (!section.content) return null;
  const node = section.content as TipTapNode;
  return (
    <section
      key={section.id}
      className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 md:p-7 shadow-lg shadow-black/40"
    >
      {renderTipTap(node)}
    </section>
  );
}

/**
 * Simple 4x5 Persona Matrix based on personality_code (A–D) & mindset_level (1–5).
 * Highlights the active cell from the QSC profile.
 */
function PersonaMatrix({ profile }: { profile: QscProfile | null | undefined }) {
  const rows = ["A", "B", "C", "D"];
  const cols = [1, 2, 3, 4, 5];

  const activeCode = profile?.profile_code || null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 md:p-5 shadow-lg shadow-black/40">
      <h3 className="text-sm md:text-base font-semibold text-slate-50 mb-3">
        Buyer Persona Matrix
      </h3>
      <div className="grid grid-cols-[auto,1fr] gap-2 md:gap-3 text-xs md:text-sm text-slate-200">
        {/* Row labels + grid */}
        <div className="flex flex-col justify-between py-5 pr-1 text-[10px] md:text-xs text-slate-400">
          <span>A</span>
          <span>B</span>
          <span>C</span>
          <span>D</span>
        </div>
        <div className="flex flex-col gap-1">
          {/* Column headers */}
          <div className="grid grid-cols-5 gap-1 text-[10px] md:text-xs text-slate-400 pb-1">
            {cols.map((c) => (
              <span key={c} className="text-center">
                {c}
              </span>
            ))}
          </div>
          {/* Grid */}
          <div className="grid grid-rows-4 gap-1">
            {rows.map((row) => (
              <div key={row} className="grid grid-cols-5 gap-1">
                {cols.map((col) => {
                  const code = `${row}${col}`;
                  const isActive = activeCode === code;
                  return (
                    <div
                      key={code}
                      className={[
                        "aspect-square rounded-md border flex items-center justify-center text-[9px] md:text-[11px]",
                        isActive
                          ? "border-sky-400 bg-sky-500/20 text-sky-100 shadow-inner shadow-sky-900/60"
                          : "border-slate-700 bg-slate-900/70 text-slate-400",
                      ].join(" ")}
                    >
                      {code}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      {profile?.profile_label && (
        <p className="mt-3 text-xs md:text-sm text-slate-300">
          Active profile: <span className="font-semibold">{profile.profile_label}</span> ({profile.profile_code})
        </p>
      )}
    </div>
  );
}

function BuyerFrequencyPie({ results }: { results: QscResults }) {
  const percentages = results.personality_percentages || {};
  const keys: PersonalityKey[] = ["FIRE", "FLOW", "FORM", "FIELD"];

  const data = keys
    .map((k) => ({
      key: k,
      label: PERSONALITY_LABELS[k],
      value: Number(percentages[k] ?? 0),
    }))
    .filter((d) => d.value > 0);

  if (!data.length) {
    return (
      <div className="text-xs text-slate-400">
        No personality scores available yet.
      </div>
    );
  }

  return (
    <div className="w-full h-48 md:h-56">
      <PieResponsive>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            outerRadius="80%"
            innerRadius="50%"
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.key}
                fill={PERSONALITY_COLORS[entry.key as PersonalityKey]}
              />
            ))}
          </Pie>
          <PieTooltip
            formatter={(value: any, _name: any, props: any) => {
              const v = Number(value || 0);
              return [`${v.toFixed(1)}%`, props.payload.label];
            }}
          />
        </PieChart>
      </PieResponsive>
    </div>
  );
}

function BuyerMindsetBar({ results }: { results: QscResults }) {
  const percentages = results.mindset_percentages || {};
  const keys: MindsetKey[] = ["ORIGIN", "MOMENTUM", "VECTOR", "ORBIT", "QUANTUM"];

  const data = keys.map((k) => ({
    key: k,
    label: MINDSET_LABELS[k],
    value: Number(percentages[k] ?? 0),
  }));

  return (
    <div className="w-full h-48 md:h-56">
      <BarResponsive>
        <BarChart data={data}>
          <XAxis dataKey="label" tick={{ fill: "#cbd5f5", fontSize: 11 }} />
          <YAxis tick={{ fill: "#cbd5f5", fontSize: 11 }} />
          <BarTooltip
            formatter={(value: any) => {
              const v = Number(value || 0);
              return [`${v.toFixed(1)}%`, "Mindset"];
            }}
          />
          <Bar dataKey="value">
            {data.map((entry) => (
              <Cell
                key={entry.key}
                fill={MINDSET_COLORS[entry.key as MindsetKey]}
              />
            ))}
          </Bar>
        </BarChart>
      </BarResponsive>
    </div>
  );
}

export default function QscReportPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [results, setResults] = useState<QscResults | null>(null);
  const [profile, setProfile] = useState<QscProfile | null>(null);
  const [sections, setSections] = useState<ReportSection[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const res = await fetch(`/api/public/qsc/${encodeURIComponent(token)}/report`, {
          cache: "no-store",
        });
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const txt = await res.text();
          throw new Error(`Non-JSON response (${res.status}): ${txt.slice(0, 300)}`);
        }
        const json = (await res.json()) as ApiResponse;
        if (!res.ok || json.ok === false) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }

        if (!alive) return;

        setResults(json.results || null);
        setProfile(json.profile || null);
        setSections(Array.isArray(json.sections) ? json.sections : []);
      } catch (e: any) {
        if (alive) setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  const combinedLabel = useMemo(() => {
    if (!results) return "";
    return results.combined_profile_code || "";
  }, [results]);

  // ---------------------------------------------------------------------------
  // States
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
        <main className="mx-auto max-w-5xl px-4 py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-300/80">
            Quantum Source Code
          </p>
          <h1 className="mt-3 text-2xl md:text-3xl font-semibold">
            Loading your strategic growth report…
          </h1>
        </main>
      </div>
    );
  }

  if (err || !results) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
        <main className="mx-auto max-w-5xl px-4 py-10 space-y-4">
          <h1 className="text-2xl md:text-3xl font-semibold">Couldn’t load report</h1>
          <p className="text-sm text-slate-300">
            Something went wrong while loading your Quantum Source Code report.
          </p>
          <pre className="mt-2 p-3 rounded border border-slate-700 bg-slate-950 text-xs text-slate-100 whitespace-pre-wrap">
{err || "No results found for this link."}
          </pre>
          <p className="text-xs text-slate-500">
            Debug: <code>/api/public/qsc/{token}/report</code>
          </p>
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main layout
  // ---------------------------------------------------------------------------

  const createdDate = new Date(results.created_at);
  const formattedDate = createdDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  const primaryPersonalityLabel = PERSONALITY_LABELS[results.primary_personality] || results.primary_personality;
  const primaryMindsetLabel = MINDSET_LABELS[results.primary_mindset] || results.primary_mindset;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 md:py-10 space-y-10">
        {/* HEADER / COVER */}
        <header className="border-b border-slate-800 pb-6 md:pb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/80">
                QSC Entrepreneur — Strategic Growth Report
              </p>
              <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-slate-50">
                Your Personal Emotional, Strategic &amp; Scaling Blueprint
              </h1>
              <p className="mt-3 text-sm md:text-base text-slate-200">
                Quantum Profile:{" "}
                <span className="font-semibold">
                  {primaryPersonalityLabel} × {primaryMindsetLabel}
                  {combinedLabel ? ` (${combinedLabel})` : ""}
                </span>
              </p>
              <p className="mt-1 text-xs md:text-sm text-slate-400">
                Prepared for: <span className="font-medium">You</span> • Date: {formattedDate}
              </p>
            </div>
            <div className="flex flex-col items-start md:items-end gap-2 text-xs md:text-sm text-slate-400">
              <span>Powered by MindCanvas • Profiletest.ai</span>
              <Link
                href={`/qsc/${encodeURIComponent(token)}`}
                className="inline-flex items-center px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-950/70 text-[11px] md:text-xs font-medium text-slate-100 hover:border-sky-400 hover:text-sky-100 transition"
              >
                ← Back to Quantum Summary
              </Link>
            </div>
          </div>
        </header>

        {/* TOP VISUALS: PIE, BAR, MATRIX */}
        <section className="grid gap-6 md:grid-cols-3">
          {/* Buyer Frequency Pie */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 md:p-5 shadow-lg shadow-black/40">
            <h3 className="text-sm md:text-base font-semibold text-slate-50 mb-2">
              Buyer Frequency Type
            </h3>
            <p className="text-xs md:text-[13px] text-slate-300 mb-3">
              Distribution of your emotional and behavioural style across the four QSC frequencies.
            </p>
            <BuyerFrequencyPie results={results} />
          </div>

          {/* Buyer Mindset Bar */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 md:p-5 shadow-lg shadow-black/40">
            <h3 className="text-sm md:text-base font-semibold text-slate-50 mb-2">
              Buyer Mindset Levels
            </h3>
            <p className="text-xs md:text-[13px] text-slate-300 mb-3">
              Where your business energy is currently focused across the five Quantum stages.
            </p>
            <BuyerMindsetBar results={results} />
          </div>

          {/* Persona Matrix */}
          <PersonaMatrix profile={profile} />
        </section>

        {/* RENDER ALL SECTIONS FROM report_sections */}
        <main className="space-y-6 md:space-y-8">
          {sections.map((section) => renderSection(section))}
        </main>

        <footer className="pt-6 text-xs md:text-sm text-slate-500 border-t border-slate-900 mt-6">
          © {new Date().getFullYear()} MindCanvas — Profiletest.ai • Quantum Source Code (Entrepreneur)
        </footer>
      </div>
    </div>
  );
}
