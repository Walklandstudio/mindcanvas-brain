// apps/web/app/qsc/[token]/page.tsx
import React from "react";

const PERSONALITY_ROWS = [
  { code: "FIRE", label: "FIRE" },
  { code: "FLOW", label: "FLOW" },
  { code: "FORM", label: "FORM" },
  { code: "FIELD", label: "FIELD" },
] as const;

const MINDSET_COLS = [
  { code: "ORIGIN", label: "Origin" },
  { code: "MOMENTUM", label: "Momentum" },
  { code: "VECTOR", label: "Vector" },
  { code: "ORBIT", label: "Orbit" },
  { code: "QUANTUM", label: "Quantum" },
] as const;

type QscResults = {
  personality_totals: Record<string, number>;
  personality_percentages: Record<string, number>;
  mindset_totals: Record<string, number>;
  mindset_percentages: Record<string, number>;
  primary_personality?: string | null;
  secondary_personality?: string | null;
  primary_mindset?: string | null;
  secondary_mindset?: string | null;
  combined_profile_code?: string | null;
};

type QscProfile = {
  title?: string | null;
  description?: string | null;
};

type QscResultApiResponse = {
  ok: boolean;
  error?: string;
  results?: QscResults;
  profile?: QscProfile | null;
};

async function getData(token: string): Promise<QscResultApiResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const res = await fetch(`${baseUrl}/api/public/qsc/${token}/result`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}` };
  }

  return (await res.json()) as QscResultApiResponse;
}

function formatPct(val: unknown): string {
  const n = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(n)) return "0.0";
  return n.toFixed(1);
}

export default async function QscResultPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const data = await getData(token);

  if (!data.ok || !data.results) {
    return (
      <div className="p-10">
        <h1 className="text-2xl font-bold mb-2">Quantum Source Code</h1>
        <p className="text-red-600">
          {data.error || "No results found for this link yet."}
        </p>
      </div>
    );
  }

  const { results, profile } = data;

  const primaryPersonality = (results.primary_personality || "").toUpperCase();
  const secondaryPersonality = (results.secondary_personality || "").toUpperCase();
  const primaryMindset = (results.primary_mindset || "").toUpperCase();
  const secondaryMindset = (results.secondary_mindset || "").toUpperCase();
  const combinedCode = results.combined_profile_code || "";

  return (
    <div className="p-8 md:p-10 max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Your Quantum Source Code
        </h1>
        <p className="text-slate-600 max-w-2xl">
          This map shows how your core leadership / buyer Personality (FIRE, FLOW,
          FORM, FIELD) combines with your current Mindset level (Origin → Quantum).
        </p>
      </header>

      {/* Overall profile + narrative */}
      <section className="bg-white shadow-sm border border-slate-100 rounded-2xl p-6 md:p-8 space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold">
          Overall Quantum Profile
        </h2>
        <p className="text-lg font-bold">
          {combinedCode || "Profile in progress"}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
          <div>
            <p className="font-semibold text-slate-900 mb-1">Personality</p>
            <p>
              Primary:{" "}
              <span className="font-semibold">
                {primaryPersonality || "—"}
              </span>
              {secondaryPersonality && (
                <>
                  {" "}
                  · Secondary:{" "}
                  <span className="font-semibold">
                    {secondaryPersonality}
                  </span>
                </>
              )}
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-900 mb-1">Mindset</p>
            <p>
              Primary:{" "}
              <span className="font-semibold">
                {primaryMindset || "—"}
              </span>
              {secondaryMindset && (
                <>
                  {" "}
                  · Secondary:{" "}
                  <span className="font-semibold">
                    {secondaryMindset}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {profile && (profile.title || profile.description) && (
          <div className="pt-4 border-t border-slate-100">
            {profile.title && (
              <p className="font-semibold text-slate-900 mb-1">
                {profile.title}
              </p>
            )}
            {profile.description && (
              <p className="text-sm md:text-base text-slate-700 whitespace-pre-line">
                {profile.description}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Matrix + side summaries */}
      <section className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-8 items-start">
        {/* Matrix */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 md:p-6 shadow-sm">
          <h3 className="text-lg md:text-xl font-semibold mb-4">
            Quantum Source Code Matrix
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Rows show your Personality frequencies. Columns show your Mindset
            level. Your exact profile is highlighted in the grid.
          </p>

          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <div className="grid"
                   style={{
                     gridTemplateColumns: `minmax(80px, 100px) repeat(${MINDSET_COLS.length}, minmax(80px, 1fr))`
                   }}>
                {/* Header row */}
                <div className="border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Personality ↓ / Mindset →
                </div>
                {MINDSET_COLS.map((col) => (
                  <div
                    key={col.code}
                    className="border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold uppercase tracking-wide text-center text-slate-600"
                  >
                    {col.label}
                  </div>
                ))}

                {/* Body rows */}
                {PERSONALITY_ROWS.map((row) => {
                  const rowPct = results.personality_percentages?.[row.code] ?? 0;

                  return (
                    <React.Fragment key={row.code}>
                      {/* Row label */}
                      <div className="border border-slate-200 bg-slate-50 px-2 py-2 text-xs md:text-sm font-semibold text-slate-700 flex flex-col">
                        <span>{row.label}</span>
                        <span className="text-[10px] md:text-xs text-slate-500">
                          {formatPct(rowPct)}%
                        </span>
                      </div>

                      {/* Cells */}
                      {MINDSET_COLS.map((col) => {
                        const colPct =
                          results.mindset_percentages?.[col.code] ?? 0;
                        const cellCode = `${row.code}_${col.code}`;

                        const isPrimary = combinedCode === cellCode;
                        const isPrimaryRow = row.code === primaryPersonality;
                        const isPrimaryCol = col.code === primaryMindset;

                        let base =
                          "border border-slate-200 px-2 py-3 text-xs md:text-sm transition-colors";
                        let inner =
                          "h-full w-full flex flex-col items-center justify-center rounded-md";

                        if (isPrimary) {
                          base += " bg-indigo-50";
                          inner +=
                            " bg-indigo-600 text-white font-semibold shadow-sm";
                        } else if (isPrimaryRow || isPrimaryCol) {
                          base += " bg-indigo-25";
                          inner +=
                            " bg-indigo-100 text-slate-900 font-medium";
                        } else {
                          base += " bg-white";
                          inner += " bg-slate-50 text-slate-600";
                        }

                        return (
                          <div key={cellCode} className={base}>
                            <div className={inner}>
                              <span className="text-[11px] md:text-xs">
                                {row.code}_{col.code}
                              </span>
                              {isPrimary && (
                                <span className="mt-1 text-[10px] uppercase tracking-wide">
                                  Primary Profile
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Side summaries */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 md:p-5 shadow-sm">
            <h4 className="text-sm md:text-base font-semibold mb-3">
              Personality Breakdown
            </h4>
            <div className="space-y-1 text-sm">
              {PERSONALITY_ROWS.map((row) => {
                const pct = results.personality_percentages?.[row.code] ?? 0;
                return (
                  <div
                    key={row.code}
                    className="flex items-center justify-between"
                  >
                    <span className="text-slate-700">{row.label}</span>
                    <span className="font-semibold">
                      {formatPct(pct)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 md:p-5 shadow-sm">
            <h4 className="text-sm md:text-base font-semibold mb-3">
              Mindset Breakdown
            </h4>
            <div className="space-y-1 text-sm">
              {MINDSET_COLS.map((col) => {
                const pct = results.mindset_percentages?.[col.code] ?? 0;
                return (
                  <div
                    key={col.code}
                    className="flex items-center justify-between"
                  >
                    <span className="text-slate-700">{col.label}</span>
                    <span className="font-semibold">
                      {formatPct(pct)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
