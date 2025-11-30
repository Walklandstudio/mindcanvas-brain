"use client";

import React from "react";

/**
 * Horizontal axis – Buyer Frequency Types
 */
export type PersonalityKey = "FIRE" | "FLOW" | "FORM" | "FIELD";

/**
 * Vertical axis – Buyer Mindset Levels
 */
export type MindsetKey =
  | "ORIGIN"
  | "MOMENTUM"
  | "VECTOR"
  | "ORBIT"
  | "QUANTUM";

/**
 * How “hot” a cell is.
 * We’ll wire this to real percentages in L6.3.
 */
type CellState = "inactive" | "primary" | "secondary" | "support";

export type QscMatrixProps = {
  primaryPersonality?: PersonalityKey | null;
  secondaryPersonality?: PersonalityKey | null;
  primaryMindset?: MindsetKey | null;
  secondaryMindset?: MindsetKey | null;

  // Optional – will be used later for more nuanced shading
  personalityPercentages?: Partial<Record<PersonalityKey, number>>;
  mindsetPercentages?: Partial<Record<MindsetKey, number>>;
};

const PERSONALITY_COLUMNS: { key: PersonalityKey; label: string; code: string }[] =
  [
    { key: "FIRE", label: "Fire", code: "A" },
    { key: "FLOW", label: "Flow", code: "B" },
    { key: "FORM", label: "Form", code: "C" },
    { key: "FIELD", label: "Field", code: "D" },
  ];

const MINDSET_ROWS: { key: MindsetKey; label: string; level: number }[] = [
  { key: "ORIGIN", level: 1, label: "Origin" },
  { key: "MOMENTUM", level: 2, label: "Momentum" },
  { key: "VECTOR", level: 3, label: "Vector" },
  { key: "ORBIT", level: 4, label: "Orbit" },
  { key: "QUANTUM", level: 5, label: "Quantum" },
];

const CELL_STYLES: Record<CellState, string> = {
  inactive:
    "bg-slate-900/40 border-slate-700/60 text-slate-400/80 hover:border-slate-500/80",
  support:
    "bg-sky-900/40 border-sky-700 text-sky-100/90 hover:border-sky-400/80",
  secondary:
    "bg-sky-700/90 border-sky-400 text-slate-50 shadow shadow-sky-900/60",
  primary:
    "bg-sky-400 text-slate-950 font-semibold shadow-lg shadow-sky-900/70 border-sky-100/90",
};

/**
 * Decide how “hot” a particular grid cell should be, based on the
 * primary / secondary personality + mindset.
 *
 * This is intentionally simple for L6.2. In L6.3 we can bring
 * in percentages from qsc_results to modulate this.
 */
function getCellState(
  row: MindsetKey,
  col: PersonalityKey,
  props: QscMatrixProps
): CellState {
  const {
    primaryPersonality,
    secondaryPersonality,
    primaryMindset,
    secondaryMindset,
  } = props;

  const isPrimary =
    primaryPersonality === col && primaryMindset === row && primaryPersonality;

  if (isPrimary) return "primary";

  const isSecondaryPersona =
    (secondaryPersonality === col && primaryMindset === row) ||
    (primaryPersonality === col && secondaryMindset === row) ||
    (secondaryPersonality === col && secondaryMindset === row);

  if (isSecondaryPersona) return "secondary";

  // “Support” cells: in same personality or same mindset as primaries
  if (
    primaryPersonality === col ||
    primaryMindset === row ||
    secondaryPersonality === col ||
    secondaryMindset === row
  ) {
    return "support";
  }

  return "inactive";
}

export function QscMatrix(props: QscMatrixProps) {
  return (
    <section
      aria-labelledby="qsc-matrix-heading"
      className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 md:p-7 shadow-lg shadow-black/50"
    >
      <header className="flex flex-col gap-2 mb-5 md:mb-6">
        <p className="text-xs font-semibold tracking-[0.22em] uppercase text-sky-300/80">
          Quantum Source Code
        </p>
        <h2
          id="qsc-matrix-heading"
          className="text-xl md:text-2xl font-semibold text-slate-50"
        >
          Buyer Persona Matrix
        </h2>
        <p className="text-xs md:text-sm text-slate-300 max-w-2xl">
          This grid maps your Buyer Frequency Type (left to right) against your
          Buyer Mindset Level (bottom to top). Your combined profile sits at the
          intersection.
        </p>
      </header>

      {/* Grid wrapper */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-top">
          {/* Column headers */}
          <div className="pl-24 pr-4 md:pl-28 md:pr-6">
            <div className="grid grid-cols-4 gap-3 md:gap-4">
              {PERSONALITY_COLUMNS.map((col) => (
                <div
                  key={col.key}
                  className="text-center text-xs md:text-sm text-slate-200"
                >
                  <div className="font-medium tracking-wide">
                    {col.label.toUpperCase()}
                  </div>
                  <div className="text-[0.7rem] md:text-xs text-slate-400 mt-0.5">
                    Frequency {col.code}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Matrix rows */}
          <div className="mt-4 space-y-3 md:space-y-4">
            {MINDSET_ROWS.map((row) => (
              <div
                key={row.key}
                className="flex items-stretch gap-3 md:gap-4"
              >
                {/* Row label (mindset) */}
                <div className="w-24 md:w-28 shrink-0 text-right pr-2 md:pr-3">
                  <div className="text-xs md:text-sm font-medium text-slate-100">
                    {row.label.toUpperCase()}
                  </div>
                  <div className="text-[0.7rem] md:text-xs text-slate-400">
                    Mindset {row.level}
                  </div>
                </div>

                {/* Row cells */}
                <div className="flex-1 pr-4 md:pr-6">
                  <div className="grid grid-cols-4 gap-3 md:gap-4">
                    {PERSONALITY_COLUMNS.map((col) => {
                      const state = getCellState(row.key, col.key, props);
                      const stateClass = CELL_STYLES[state];

                      const personaLabel = `${col.label} ${row.label}`;
                      const code = `${col.key[0]}${row.level}`;

                      return (
                        <div
                          key={col.key + "_" + row.key}
                          className={[
                            "rounded-xl border text-xs md:text-sm px-2 py-3 md:px-3 md:py-4",
                            "transition-colors duration-150 ease-out",
                            "flex flex-col items-start justify-between min-h-[64px] md:min-h-[80px]",
                            stateClass,
                          ].join(" ")}
                          aria-label={personaLabel}
                        >
                          <div className="text-[0.65rem] uppercase tracking-[0.18em] text-slate-200/80">
                            {personaLabel}
                          </div>
                          <div className="mt-1 text-[0.7rem] md:text-xs text-slate-950/70 dark:text-slate-100/90">
                            Code:{" "}
                            <span className="font-mono tracking-wide">
                              {code}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-3 text-[0.7rem] md:text-xs text-slate-400">
            <div className="inline-flex items-center gap-2">
              <span className="inline-block h-3 w-5 rounded bg-sky-400" />
              <span>Primary combined profile</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="inline-block h-3 w-5 rounded bg-sky-700" />
              <span>Secondary profile / supporting mode</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="inline-block h-3 w-5 rounded bg-sky-900/60" />
              <span>Related frequencies or mindsets</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="inline-block h-3 w-5 rounded bg-slate-900/70 border border-slate-700/70" />
              <span>Other personas</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
