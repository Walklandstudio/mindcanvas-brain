// apps/web/app/t/[token]/report/LegacyReportClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import AppBackground from "@/components/ui/AppBackground";

type FrequencyCode = "A" | "B" | "C" | "D";

type FrequencyLabel = { code: FrequencyCode; name: string };
type ProfileLabel = { code: string; name: string };

type Block =
  | { type: "p"; text: string }
  | { type: "h1" | "h2" | "h3" | "h4"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; text: string; cite?: string }
  | { type: "divider" }
  | { type: string; [k: string]: any };

type Section = {
  id?: string;
  title?: string;
  blocks?: Block[];
  [k: string]: any;
};

type SectionsShape =
  | Section[] // (older format)
  | Record<string, Section[]>; // (your current format: { common: [...] })

type ResultData = {
  org_slug: string;
  org_name?: string | null;
  test_name: string;

  taker: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };

  frequency_labels: FrequencyLabel[];
  frequency_totals?: Record<FrequencyCode, number>;
  frequency_percentages: Record<FrequencyCode, number>;

  profile_labels: ProfileLabel[];
  profile_totals?: Record<string, number>;
  profile_percentages: Record<string, number>;

  top_freq: FrequencyCode;
  top_profile_code: string;
  top_profile_name: string;

  sections?: SectionsShape | null;

  // optional metadata
  version?: string;
};

type API = { ok: boolean; data?: ResultData; error?: string };

function getFullName(taker: ResultData["taker"]): string {
  const rawFirst =
    (typeof taker.first_name === "string" && taker.first_name) ||
    (typeof taker.firstName === "string" && taker.firstName) ||
    "";
  const rawLast =
    (typeof taker.last_name === "string" && taker.last_name) ||
    (typeof taker.lastName === "string" && taker.lastName) ||
    "";
  const full = `${rawFirst.trim()} ${rawLast.trim()}`.trim();
  return full || "Participant";
}

function pct(n: number | undefined): number {
  if (!n || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function safeText(v: any): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function normaliseSections(
  sections: SectionsShape | null | undefined
): Array<{
  groupKey: string;
  sections: Section[];
}> {
  if (!sections) return [];
  if (Array.isArray(sections)) {
    return [{ groupKey: "sections", sections }];
  }
  if (typeof sections === "object") {
    return Object.entries(sections)
      .filter(([, v]) => Array.isArray(v))
      .map(([k, v]) => ({ groupKey: k, sections: v as Section[] }));
  }
  return [];
}

function titleForGroupKey(k: string): string {
  const key = (k || "").toLowerCase();
  if (key === "common") return "Core sections";
  if (key.includes("frequency")) return "Frequency sections";
  if (key.includes("profile")) return "Profile sections";
  if (key.includes("next")) return "Next steps";
  // fallback
  return k.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function BlockRenderer({ block }: { block: Block }) {
  const type = block?.type;

  if (type === "divider") {
    return <hr className="my-6 border-white/10" />;
  }

  if (type === "h1") {
    return (
      <h1 className="text-2xl font-semibold text-white">
        {safeText((block as any).text)}
      </h1>
    );
  }
  if (type === "h2") {
    return (
      <h2 className="text-xl font-semibold text-white">
        {safeText((block as any).text)}
      </h2>
    );
  }
  if (type === "h3") {
    return (
      <h3 className="text-lg font-semibold text-white">
        {safeText((block as any).text)}
      </h3>
    );
  }
  if (type === "h4") {
    return (
      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
        {safeText((block as any).text)}
      </h4>
    );
  }

  if (type === "p") {
    return (
      <p className="text-sm leading-relaxed text-slate-200">
        {safeText((block as any).text)}
      </p>
    );
  }

  if (type === "ul") {
    const items = Array.isArray((block as any).items) ? (block as any).items : [];
    return (
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">
        {items.map((it: string, i: number) => (
          <li key={i}>{safeText(it)}</li>
        ))}
      </ul>
    );
  }

  if (type === "ol") {
    const items = Array.isArray((block as any).items) ? (block as any).items : [];
    return (
      <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-200">
        {items.map((it: string, i: number) => (
          <li key={i}>{safeText(it)}</li>
        ))}
      </ol>
    );
  }

  if (type === "quote") {
    const text = safeText((block as any).text);
    const cite = safeText((block as any).cite);
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm italic leading-relaxed text-slate-100">“{text}”</p>
        {cite ? <p className="mt-2 text-xs text-slate-400">— {cite}</p> : null}
      </div>
    );
  }

  // Unknown block type: render safely so content never disappears
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs text-slate-400">
        Unsupported block type: {safeText(type)}
      </p>
      <pre className="mt-2 overflow-auto text-xs text-slate-200">
        {JSON.stringify(block, null, 2)}
      </pre>
    </div>
  );
}

export default function LegacyReportClient(props: { token: string; tid: string }) {
  const { token, tid } = props;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<ResultData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setLoadError(null);
        setData(null);

        if (!tid) {
          setLoadError("This page expects a ?tid= parameter.");
          setLoading(false);
          return;
        }

        const url = `/api/public/test/${encodeURIComponent(
          token
        )}/report?tid=${encodeURIComponent(tid)}`;

        const res = await fetch(url, { cache: "no-store" });

        const text = await res.text();
        let json: API | null = null;
        try {
          json = text ? (JSON.parse(text) as API) : null;
        } catch {
          throw new Error(
            `Non-JSON response (${res.status}): ${text.slice(0, 200)}`
          );
        }

        if (!res.ok || !json || json.ok === false || !json.data) {
          throw new Error(json?.error || `HTTP ${res.status}`);
        }

        if (cancelled) return;

        setData(json.data);
        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        setLoadError(String(e?.message || e));
        setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token, tid]);

  const sectionGroups = useMemo(
    () => normaliseSections(data?.sections ?? null),
    [data?.sections]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050914] text-white">
        <AppBackground />
        <main className="relative z-10 mx-auto max-w-4xl p-6">
          <h1 className="text-2xl font-semibold">Personalised report</h1>
          <p className="mt-4 text-sm text-slate-300">Loading your report…</p>
        </main>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="min-h-screen bg-[#050914] text-white">
        <AppBackground />
        <main className="relative z-10 mx-auto max-w-4xl p-6 space-y-4">
          <h1 className="text-2xl font-semibold">Personalised report</h1>
          <p className="text-sm text-red-400">Could not load your report.</p>
          <details className="rounded-lg border border-slate-700 bg-slate-950 p-4 text-xs text-slate-50">
            <summary className="cursor-pointer font-medium">
              Debug information
            </summary>
            <div className="mt-2 space-y-2">
              <div>Error: {loadError ?? "Unknown"}</div>
              <div>token: {token}</div>
              <div>tid: {tid}</div>
            </div>
          </details>
        </main>
      </div>
    );
  }

  const orgName = data.org_name || data.test_name || data.org_slug;
  const participantName = getFullName(data.taker);

  const sortedProfiles = [...data.profile_labels]
    .map((p) => ({ ...p, pct: data.profile_percentages[p.code] ?? 0 }))
    .sort((a, b) => (b.pct || 0) - (a.pct || 0));

  const primary = sortedProfiles[0];
  const secondary = sortedProfiles[1];
  const tertiary = sortedProfiles[2];

  return (
    <div className="min-h-screen bg-[#050914] text-white">
      <AppBackground />

      <main className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-8 md:px-6 space-y-8">
        {/* HEADER */}
        <header className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-300">
            PERSONALISED REPORT
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {data.test_name}
          </h1>
          <p className="mt-2 text-sm text-slate-200">
            For <span className="font-semibold">{participantName}</span> ·
            Organisation: <span className="font-semibold">{orgName}</span>
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Top profile:{" "}
            <span className="font-semibold">{data.top_profile_name}</span>
          </p>
        </header>

        {/* SCORES */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Frequencies</h2>
            <div className="mt-4 space-y-3">
              {data.frequency_labels.map((f) => {
                const v = pct(data.frequency_percentages[f.code]);
                return (
                  <div key={f.code} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-100 font-medium">
                        {f.name} ({f.code})
                      </span>
                      <span className="text-slate-300">
                        {Math.round(v * 100)}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full bg-white/60"
                        style={{ width: `${v * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Top profile mix</h2>
            <p className="mt-2 text-sm text-slate-300">
              Primary:{" "}
              <span className="text-slate-100 font-semibold">
                {primary?.name}
              </span>
              {secondary?.name ? (
                <>
                  {" · "}Secondary:{" "}
                  <span className="text-slate-100 font-semibold">
                    {secondary.name}
                  </span>
                </>
              ) : null}
              {tertiary?.name ? (
                <>
                  {" · "}Tertiary:{" "}
                  <span className="text-slate-100 font-semibold">
                    {tertiary.name}
                  </span>
                </>
              ) : null}
            </p>

            <div className="mt-4 space-y-3">
              {data.profile_labels.map((p) => {
                const v = pct(data.profile_percentages[p.code]);
                return (
                  <div key={p.code} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-100 font-medium">{p.name}</span>
                      <span className="text-slate-300">
                        {Math.round(v * 100)}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full bg-white/60"
                        style={{ width: `${v * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTIONS */}
        <section className="space-y-6">
          {sectionGroups.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold">Report content</h2>
              <p className="mt-2 text-sm text-slate-300">
                No sections were provided in the API response.
              </p>
            </div>
          ) : (
            sectionGroups.map((g) => (
              <div key={g.groupKey} className="space-y-4">
                <h2 className="text-xl font-semibold">
                  {titleForGroupKey(g.groupKey)}
                </h2>

                {g.sections.map((s, idx) => (
                  <article
                    key={s.id || `${g.groupKey}-${idx}`}
                    className="rounded-2xl border border-white/10 bg-white/5 p-6"
                  >
                    {s.title ? (
                      <h3 className="text-lg font-semibold text-white">
                        {safeText(s.title)}
                      </h3>
                    ) : null}

                    {Array.isArray(s.blocks) && s.blocks.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        {s.blocks.map((b: any, i: number) => (
                          <BlockRenderer key={i} block={b} />
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 text-sm text-slate-300">
                        No blocks found for this section.
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ))
          )}
        </section>

        <footer className="border-t border-white/10 pt-6 text-xs text-slate-400">
          © {new Date().getFullYear()} MindCanvas
        </footer>
      </main>
    </div>
  );
}

