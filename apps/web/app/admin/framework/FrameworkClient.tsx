"use client";

import { useMemo } from "react";

type Profile = {
  id: string;
  name: string;
  frequency: "A" | "B" | "C" | "D";
  image_url: string | null;
  ordinal: number | null;
  summary?: string | null;
  strengths?: string | null; // newline-separated bullets
};

export default function FrameworkClient(props: {
  orgId: string | null;
  frameworkId: string | null;
  initialProfiles: Profile[];
  initialFrequencies: Record<"A" | "B" | "C" | "D", string> | null;
}) {
  const freqNames = props.initialFrequencies ?? { A: "A", B: "B", C: "C", D: "D" };

  const grouped = useMemo(() => {
    const by: Record<"A" | "B" | "C" | "D", Profile[]> = { A: [], B: [], C: [], D: [] };
    for (const p of props.initialProfiles) by[p.frequency].push(p);
    (Object.keys(by) as Array<keyof typeof by>).forEach((k) =>
      by[k].sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0))
    );
    return by;
  }, [props.initialProfiles]);

  const freqChip = (code: "A" | "B" | "C" | "D") => (
    <div key={code} className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-white/10 grid place-items-center"> {code} </div>
        <div className="font-semibold">{freqNames[code]}</div>
      </div>
    </div>
  );

  const card = (p: Profile) => {
    const bullets = (p.strengths ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);

    return (
      <div key={p.id} className="mc-card p-5">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-white/10 grid place-items-center text-sm">
            {p.frequency}
          </div>
          <div className="flex-1">
            <div className="font-semibold">{p.name}</div>
            <div className="text-xs text-white/60">Frequency {p.frequency}</div>
          </div>
        </div>

        {p.summary && <p className="mt-3 text-sm leading-relaxed">{p.summary}</p>}

        {bullets.length > 0 && (
          <ul className="mt-3 list-disc pl-6 text-sm space-y-1">
            {bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Frequency chips */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-white/70">Frequencies</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(["A", "B", "C", "D"] as const).map((k) => freqChip(k))}
        </div>
      </div>

      {/* Profile cards */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-white/70">Recommended Profiles</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(["A", "B", "C", "D"] as const).flatMap((k) => grouped[k].map(card))}
        </div>
      </div>
    </div>
  );
}
