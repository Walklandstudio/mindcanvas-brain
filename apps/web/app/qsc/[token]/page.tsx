// apps/web/app/qsc/[token]/page.tsx
"use client";

import { useEffect, useState } from "react";

type PersonalityKey = "FIRE" | "FLOW" | "FORM" | "FIELD" | string;
type MindsetKey =
  | "ORIGIN"
  | "MOMENTUM"
  | "VECTOR"
  | "ORBIT"
  | "QUANTUM"
  | string;

type QscResult = {
  test_name?: string | null;
  taker_first_name?: string | null;
  taker_last_name?: string | null;

  personality_totals: Record<PersonalityKey, number>;
  personality_percentages: Record<PersonalityKey, number>;
  mindset_totals: Record<MindsetKey, number>;
  mindset_percentages: Record<MindsetKey, number>;

  primary_personality?: PersonalityKey | null;
  secondary_personality?: PersonalityKey | null;
  primary_mindset?: MindsetKey | null;
  secondary_mindset?: MindsetKey | null;

  combined_profile_code?: string | null;
  profile_title?: string | null;
  profile_subtitle?: string | null;
};

type ApiResponse =
  | { ok: true; data: QscResult }
  | { ok: false; error: string };

const PERSONALITY_ORDER: PersonalityKey[] = ["FIRE", "FLOW", "FORM", "FIELD"];
const MINDSET_ORDER: MindsetKey[] = [
  "ORIGIN",
  "MOMENTUM",
  "VECTOR",
  "ORBIT",
  "QUANTUM",
];

const PERSONALITY_LABELS: Record<string, string> = {
  FIRE: "Fire",
  FLOW: "Flow",
  FORM: "Form",
  FIELD: "Field",
};

const MINDSET_LABELS: Record<string, string> = {
  ORIGIN: "Origin",
  MOMENTUM: "Momentum",
  VECTOR: "Vector",
  ORBIT: "Orbit",
  QUANTUM: "Quantum",
};

function percentLabel(v: number | undefined) {
  if (!v || Number.isNaN(v)) return "0%";
  return `${Math.round(v)}%`;
}

export default function QscResultPage({
  params,
}: {
  params: { token: string };
}) {
  const { token } = params;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [result, setResult] = useState<QscResult | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const res = await fetch(
          `/api/public/qsc/${encodeURIComponent(token)}/result`,
          { cache: "no-store" }
        );

        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(
            `Non-JSON response (${res.status}): ${text.slice(0, 300)}`
          );
        }

        const json = (await res.json()) as ApiResponse;
        if (!res.ok || json.ok === false) {
          throw new Error(
            (json as any).error || `HTTP ${res.status} fetching QSC result`
          );
        }

        if (alive) setResult(json.data);
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

  const title = result?.test_name || "Quantum Source Code Diagnostic";

  const fullName =
    [result?.taker_first_name, result?.taker_last_name]
      .filter(Boolean)
      .join(" ") || "Your";

  const primaryPersonality = result?.primary_personality || null;
  const primaryMindset = result?.primary_mindset || null;

  const personalityPerc = result?.personality_percentages || {};
  const mindsetPerc = result?.mindset_percentages || {};

  // ---------------------------------------------------------------------------
  // Basic states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <main className="mx-auto max-w-4xl px-4 py-10">
          <h1 className="text-2xl font-semibold">
            Loading your Quantum Source Code result…
          </h1>
        </main>
      </div>
    );
  }

  if (err || !result) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <main className="mx-auto max-w-4xl px-4 py-10">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-slate-300">
            We couldn&apos;t load your Quantum Source Code result.
          </p>
          <pre className="mt-4 p-3 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100 whitespace-pre-wrap">
{err || "No data"}
          </pre>
          <p className="mt-4 text-xs text-slate-500">
            Debug endpoint:{" "}
            <code>/api/public/qsc/{token}/result</code>
          </p>
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main UI
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <main className="mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-10">
        {/* Header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-slate-800 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-300/80">
              Quantum Source Code
            </p>
            <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
              {title}
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              {fullName} Quantum Buyer Persona
            </p>
            {result.profile_title && (
              <p className="mt-3 text-sm font-medium text-sky-200">
                {result.profile_title}
              </p>
            )}
            {result.profile_subtitle && (
              <p className="mt-1 text-sm text-slate-200">
                {result.profile_subtitle}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-sky-500/60 bg-slate-950/70 px-4 py-3 text-xs text-slate-200 max-w-sm shadow-lg shadow-black/40">
            <p className="font-semibold text-sky-200">Snapshot</p>
            <p className="mt-1">
              Primary personality:{" "}
              <span className="font-semibold">
                {primaryPersonality || "—"}
              </span>
            </p>
            <p>
              Primary mindset:{" "}
              <span className="font-semibold">
                {primaryMindset || "—"}
              </span>
            </p>
            {result.combined_profile_code && (
              <p className="mt-1 text-slate-300">
                Combined profile:{" "}
                <span className="font-semibold">
                  {result.combined_profile_code}
                </span>
              </p>
            )}
          </div>
        </header>

        {/* Personality & Mindset bars */}
        <section className="grid gap-6 md:grid-cols-2">
          {/* Personality */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-lg shadow-black/40">
            <h2 className="text-lg font-semibold mb-3">
              Buyer Frequency Types
            </h2>
            <p className="text-xs text-slate-300 mb-4">
              How they think, decide, and buy.
            </p>
            <div className="space-y-3">
              {PERSONALITY_ORDER.map((k) => {
                const pct = personalityPerc[k] ?? 0;
                return (
                  <div key={k}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-100">
                        {PERSONALITY_LABELS[k] || k}
                      </span>
                      <span className="text-slate-400">
                        {percentLabel(pct)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded bg-slate-800">
                      <div
                        className="h-2 rounded bg-sky-500"
                        style={{
                          width: `${Math.max(0, Math.min(100, pct))}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mindset */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-lg shadow-black/40">
            <h2 className="text-lg font-semibold mb-3">
              Buyer Mindset Levels
            </h2>
            <p className="text-xs text-slate-300 mb-4">
              Where they are in their business journey.
            </p>
            <div className="space-y-3">
              {MINDSET_ORDER.map((k) => {
                const pct = mindsetPerc[k] ?? 0;
                return (
                  <div key={k}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-100">
                        {MINDSET_LABELS[k] || k}
                      </span>
                      <span className="text-slate-400">
                        {percentLabel(pct)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded bg-slate-800">
                      <div
                        className="h-2 rounded bg-emerald-500"
                        style={{
                          width: `${Math.max(0, Math.min(100, pct))}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Heat map */}
        <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 md:p-7 shadow-lg shadow-black/40">
          <h2 className="text-lg font-semibold mb-2">
            Quantum Profile Matrix
          </h2>
          <p className="text-xs text-slate-300 mb-5 max-w-2xl">
            This matrix combines buyer frequency types (rows) with mindset
            levels (columns). Your primary profile is highlighted, giving a
            quick visual of where this buyer sits on the 20-profile map.
          </p>

          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `120px repeat(${MINDSET_ORDER.length}, minmax(80px, 1fr))`,
                }}
              >
                {/* Header row */}
                <div />
                {MINDSET_ORDER.map((m) => (
                  <div
                    key={m}
                    className="px-2 pb-2 text-xs font-semibold text-center text-slate-200"
                  >
                    {MINDSET_LABELS[m] || m}
                  </div>
                ))}

                {/* Rows */}
                {PERSONALITY_ORDER.map((p) => (
                  <MatrixRow
                    key={p}
                    personality={p}
                    primaryPersonality={primaryPersonality}
                    primaryMindset={primaryMindset}
                    mindsets={MINDSET_ORDER}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <footer className="pt-4 text-xs text-slate-500">
          © {new Date().getFullYear()} MindCanvas — Profiletest.ai
        </footer>
      </main>
    </div>
  );
}

type MatrixRowProps = {
  personality: PersonalityKey;
  primaryPersonality: PersonalityKey | null;
  primaryMindset: MindsetKey | null;
  mindsets: MindsetKey[];
};

function MatrixRow({
  personality,
  primaryPersonality,
  primaryMindset,
  mindsets,
}: MatrixRowProps) {
  const isPrimaryRow =
    primaryPersonality &&
    personality &&
    primaryPersonality.toUpperCase() === personality.toUpperCase();

  return (
    <>
      <div className="py-2 pr-3 text-xs font-medium text-right text-slate-200">
        {PERSONALITY_LABELS[personality] || personality}
      </div>
      {mindsets.map((m) => {
        const isPrimaryCol =
          primaryMindset &&
          m &&
          primaryMindset.toUpperCase() === m.toUpperCase();
        const isPrimaryCell = isPrimaryRow && isPrimaryCol;

        return (
          <div
            key={String(m)}
            className={[
              "h-10 m-1 rounded-lg border transition",
              isPrimaryCell
                ? "border-sky-400 bg-sky-500/25 shadow-[0_0_0_1px_rgba(56,189,248,0.6)]"
                : "border-slate-800 bg-slate-900/70",
            ].join(" ")}
          />
        );
      })}
    </>
  );
}
