// apps/web/app/t/[token]/report/LegacyReportClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import AppBackground from "@/components/ui/AppBackground";

type FrequencyCode = "A" | "B" | "C" | "D";

type FrequencyLabel = { code: FrequencyCode; name: string };
type ProfileLabel = { code: string; name: string };

type LinkMeta = {
  show_results?: boolean | null;
  redirect_url?: string | null;
  hidden_results_message?: string | null;
  next_steps_url?: string | null;
};

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
  | Section[] // older
  | Record<string, Section[]>; // current: { common: [...] }

type ResultData = {
  org_slug: string;
  org_name?: string | null;
  test_name: string;

  link?: LinkMeta;

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

function pct01(n: number | undefined): number {
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
): Array<{ groupKey: string; sections: Section[] }> {
  if (!sections) return [];
  if (Array.isArray(sections)) return [{ groupKey: "sections", sections }];
  if (typeof sections === "object") {
    return Object.entries(sections)
      .filter(([, v]) => Array.isArray(v))
      .map(([k, v]) => ({ groupKey: k, sections: v as Section[] }));
  }
  return [];
}

function titleForGroupKey(k: string): string {
  const key = (k || "").toLowerCase();
  if (key === "common") return "Contents of This Report";
  if (key.includes("frequency")) return "Frequency Sections";
  if (key.includes("profile")) return "Profile Sections";
  if (key.includes("next")) return "Next Steps";
  return k.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

/**
 * White-card styling to match your legacy report look.
 * (Dark background stays, but content containers are white.)
 */
function WhiteCard(props: { children: any; className?: string }) {
  return (
    <div
      className={
        "rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900 " +
        (props.className ?? "")
      }
    >
      {props.children}
    </div>
  );
}

function BlockRenderer({ block }: { block: Block }) {
  const type = block?.type;

  if (type === "divider") return <hr className="my-6 border-slate-200" />;

  if (type === "h1") return <h1 className="text-2xl font-semibold text-slate-900">{safeText((block as any).text)}</h1>;
  if (type === "h2") return <h2 className="text-xl font-semibold text-slate-900">{safeText((block as any).text)}</h2>;
  if (type === "h3") return <h3 className="text-lg font-semibold text-slate-900">{safeText((block as any).text)}</h3>;

  // ✅ h4 used throughout LEAD content as sub-headings / callouts
  if (type === "h4") {
    return (
      <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {safeText((block as any).text)}
      </h4>
    );
  }

  if (type === "p") {
    return <p className="text-sm leading-relaxed text-slate-700">{safeText((block as any).text)}</p>;
  }

  if (type === "ul") {
    const items = Array.isArray((block as any).items) ? (block as any).items : [];
    return (
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
        {items.map((it: string, i: number) => (
          <li key={i}>{safeText(it)}</li>
        ))}
      </ul>
    );
  }

  if (type === "ol") {
    const items = Array.isArray((block as any).items) ? (block as any).items : [];
    return (
      <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
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
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm italic leading-relaxed text-slate-800">“{text}”</p>
        {cite ? <p className="mt-2 text-xs text-slate-500">— {cite}</p> : null}
      </div>
    );
  }

  // Unknown block type: keep visible for dev without breaking report
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs font-semibold text-amber-900">Unsupported block type: {safeText(type)}</p>
      <pre className="mt-2 overflow-auto text-xs text-amber-950">{JSON.stringify(block, null, 2)}</pre>
    </div>
  );
}

export default function LegacyReportClient(props: { token: string; tid: string }) {
  const { token, tid } = props;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<ResultData | null>(null);

  const reportRef = useRef<HTMLDivElement | null>(null);

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

        const url = `/api/public/test/${encodeURIComponent(token)}/report?tid=${encodeURIComponent(tid)}`;

        const res = await fetch(url, { cache: "no-store" });
        const text = await res.text();

        let json: API | null = null;
        try {
          json = text ? (JSON.parse(text) as API) : null;
        } catch {
          throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
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

  const sectionGroups = useMemo(() => normaliseSections(data?.sections ?? null), [data?.sections]);

  const participantName = data ? getFullName(data.taker) : "Participant";
  const orgName = data ? data.org_name || data.test_name || data.org_slug : "";
  const nextStepsUrl = (data?.link?.next_steps_url || "").trim();
  const hasNextSteps = Boolean(nextStepsUrl);

  async function handleDownloadPdf() {
    if (!reportRef.current) return;

    const element = reportRef.current;

    const prevScroll = window.scrollY;
    window.scrollTo(0, 0);

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#050914",
        scrollY: -window.scrollY,
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

      const safeName = (data?.test_name || "mindcanvas-report").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      pdf.save(`${safeName}-${token}.pdf`);
    } finally {
      window.scrollTo(0, prevScroll);
    }
  }

  if (!tid) {
    return (
      <div className="min-h-screen bg-[#050914] text-white">
        <AppBackground />
        <main className="relative z-10 mx-auto max-w-4xl p-6">
          <h1 className="text-2xl font-semibold">Personalised report</h1>
          <p className="mt-4 text-sm text-slate-300">
            This page expects a <code>?tid=</code> parameter so we know which test taker’s report to load.
          </p>
        </main>
      </div>
    );
  }

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
            <summary className="cursor-pointer font-medium">Debug information</summary>
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

  // top 3 profiles
  const sortedProfiles = [...data.profile_labels]
    .map((p) => ({ ...p, pct: data.profile_percentages[p.code] ?? 0 }))
    .sort((a, b) => (b.pct || 0) - (a.pct || 0));

  const primary = sortedProfiles[0];
  const secondary = sortedProfiles[1];
  const tertiary = sortedProfiles[2];

  return (
    <div ref={reportRef} className="relative min-h-screen bg-[#050914] text-white overflow-hidden">
      <AppBackground />

      <div className="relative z-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 pb-12 pt-8 md:px-6">
          {/* HEADER */}
          <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-medium tracking-[0.2em] text-slate-300">PERSONALISED REPORT</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">{data.test_name}</h1>
              <p className="mt-2 text-sm text-slate-200">
                For {participantName} · Organisation: <span className="font-semibold">{orgName}</span>
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Top profile: <span className="font-semibold">{data.top_profile_name}</span>
              </p>
            </div>

            {/* Buttons like your other reports */}
            <div className="flex items-center gap-3">
              {hasNextSteps && (
                <button
                  onClick={() => window.open(nextStepsUrl, "_blank", "noopener,noreferrer")}
                  className="inline-flex items-center rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 shadow-sm hover:bg-emerald-500/15"
                  title="Open next steps"
                >
                  Next steps
                </button>
              )}

              <button
                onClick={handleDownloadPdf}
                className="inline-flex items-center rounded-lg border border-slate-500 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm hover:bg-slate-800"
              >
                Download PDF
              </button>
            </div>
          </header>

          {/* SCORES — now as WHITE containers */}
          <section className="grid gap-4 md:grid-cols-2">
            <WhiteCard>
              <h2 className="text-lg font-semibold text-slate-900">Frequencies</h2>

              <div className="mt-4 space-y-3">
                {data.frequency_labels.map((f) => {
                  const v = pct01(data.frequency_percentages[f.code]);
                  const pct = v * 100;
                  return (
                    <div key={f.code} className="grid grid-cols-12 items-center gap-3">
                      <div className="col-span-4 md:col-span-3 text-sm text-slate-800">
                        <span className="font-medium">{f.name}</span>{" "}
                        <span className="text-slate-500">({f.code})</span>
                      </div>
                      <div className="col-span-8 md:col-span-9">
                        <div className="h-2 w-full rounded-full bg-slate-200">
                          <div className="h-2 rounded-full bg-sky-600" style={{ width: `${pct.toFixed(0)}%` }} />
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{pct.toFixed(0)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </WhiteCard>

            <WhiteCard>
              <h2 className="text-lg font-semibold text-slate-900">Top profile mix</h2>
              <p className="mt-2 text-sm text-slate-700">
                Primary: <span className="font-semibold">{primary?.name}</span>
                {secondary?.name ? (
                  <>
                    {" · "}Secondary: <span className="font-semibold">{secondary.name}</span>
                  </>
                ) : null}
                {tertiary?.name ? (
                  <>
                    {" · "}Tertiary: <span className="font-semibold">{tertiary.name}</span>
                  </>
                ) : null}
              </p>

              <div className="mt-4 space-y-3">
                {data.profile_labels.map((p) => {
                  const v = pct01(data.profile_percentages[p.code]);
                  const pct = v * 100;
                  return (
                    <div key={p.code} className="grid grid-cols-12 items-center gap-3">
                      <div className="col-span-4 md:col-span-3 text-sm text-slate-800">
                        <span className="font-medium">{p.name}</span>
                      </div>
                      <div className="col-span-8 md:col-span-9">
                        <div className="h-2 w-full rounded-full bg-slate-200">
                          <div className="h-2 rounded-full bg-sky-600" style={{ width: `${pct.toFixed(0)}%` }} />
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{pct.toFixed(0)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </WhiteCard>
          </section>

          {/* SECTIONS — white containers like legacy */}
          <section className="space-y-6">
            {sectionGroups.length === 0 ? (
              <WhiteCard>
                <h2 className="text-lg font-semibold text-slate-900">Report content</h2>
                <p className="mt-2 text-sm text-slate-700">No sections were provided in the API response.</p>
              </WhiteCard>
            ) : (
              sectionGroups.map((g) => (
                <div key={g.groupKey} className="space-y-4">
                  {/* For the common group, this becomes the Contents header */}
                  <h2 className="text-xl font-semibold text-white">{titleForGroupKey(g.groupKey)}</h2>

                  {g.sections.map((s, idx) => (
                    <WhiteCard key={s.id || `${g.groupKey}-${idx}`}>
                      {s.title ? <h3 className="text-lg font-semibold text-slate-900">{safeText(s.title)}</h3> : null}

                      {Array.isArray(s.blocks) && s.blocks.length > 0 ? (
                        <div className="mt-4 space-y-3">
                          {s.blocks.map((b: any, i: number) => (
                            <BlockRenderer key={i} block={b} />
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4 text-sm text-slate-700">No blocks found for this section.</div>
                      )}
                    </WhiteCard>
                  ))}
                </div>
              ))
            )}
          </section>

          {/* Bottom CTA like your other reports */}
          <footer className="mt-6 space-y-4 border-t border-slate-800 pt-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-xs text-slate-400">© {new Date().getFullYear()} MindCanvas</p>

              <div className="flex items-center gap-3">
                {hasNextSteps && (
                  <button
                    onClick={() => window.open(nextStepsUrl, "_blank", "noopener,noreferrer")}
                    className="inline-flex items-center rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 shadow-sm hover:bg-emerald-500/15"
                  >
                    Next steps
                  </button>
                )}

                <button
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center rounded-lg border border-slate-500 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm hover:bg-slate-800"
                >
                  Download PDF
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

