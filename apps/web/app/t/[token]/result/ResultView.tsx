// apps/web/app/t/[token]/result/ResultView.tsx
"use client";

type PercentMap = Record<string, number>;
type LabelMap = Record<string, string>;

type ReportData = {
  meta: { test_id: string; taker_id: string; token: string };
  identity: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    company: string | null;
    role_title: string | null;
  };
  frequencies: {
    raw: Record<string, number>;
    percents: PercentMap;      // A..D
    labels: LabelMap;          // A..D -> human name
  };
  profiles: {
    raw: Record<string, number>;
    percents: PercentMap;      // PROFILE_1..8
    labels: LabelMap;          // PROFILE_1..8 -> human name
  };
};

export default function ResultView({ data }: { data: ReportData }) {
  const { identity, frequencies, profiles } = data;

  const freqItems = Object.entries(frequencies.percents).map(([code, pct]) => ({
    code,
    name: frequencies.labels[code] ?? code,
    pct,
  }));

  const profItems = Object.entries(profiles.percents).map(([code, pct]) => ({
    code,
    name: profiles.labels[code] ?? code,
    pct,
  }));

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Your Results</h1>
        <p className="text-sm text-gray-600">
          {identity.first_name || identity.last_name
            ? `${identity.first_name ?? ""} ${identity.last_name ?? ""}`.trim()
            : "Anonymous"}
          {identity.company ? ` · ${identity.company}` : ""}
          {identity.role_title ? ` · ${identity.role_title}` : ""}
        </p>
      </header>

      {/* Frequencies */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Frequencies</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {freqItems.map((f) => (
            <div
              key={f.code}
              className="border rounded-lg p-4 flex items-center justify-between"
            >
              <div className="font-medium">{f.name}</div>
              <div className="text-xl tabular-nums">{f.pct.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </section>

      {/* Profiles */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Profiles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {profItems.map((p) => (
            <div
              key={p.code}
              className="border rounded-lg p-4 flex items-center justify-between"
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-xl tabular-nums">{p.pct.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
