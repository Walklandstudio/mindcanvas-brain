// apps/web/app/t/[token]/report/LegacyReportClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppBackground from "@/components/ui/AppBackground";
import { getBaseUrl } from "@/lib/server-url";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type AB = "A" | "B" | "C" | "D";

type LinkMeta = {
  next_steps_url?: string | null;
  show_results?: boolean | null;
  redirect_url?: string | null;
  hidden_results_message?: string | null;
};

type SectionBlock =
  | { type: "p"; text?: string }
  | { type: "ul"; items?: string[] }
  | { type: "ol"; items?: string[] }
  | { type: "quote"; text?: string; cite?: string }
  | { type: "divider" }
  | { type: "h1" | "h2" | "h3" | "h4"; text?: string }
  | { type: string; [k: string]: any };

type ReportSection = {
  id?: string;
  title?: string;
  blocks?: SectionBlock[];
};

type SectionsPayload = {
  common?: ReportSection[] | null;
  profile?: ReportSection[] | null;
  report_title?: string | null;
  profile_missing?: boolean;
  framework_version?: string | null;
  framework_bucket?: string | null;
  framework_path?: string | null;
};

type ResultData = {
  org_slug: string;
  org_name?: string | null;
  test_name: string;
  taker: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
  };
  link?: LinkMeta;

  frequency_labels: Array<{ code: AB; name: string }>;
  frequency_percentages: Record<AB, number>;

  profile_labels: Array<{ code: string; name: string }>;
  profile_percentages: Record<string, number>;

  top_freq: AB;
  top_profile_code: string;
  top_profile_name: string;

  sections?: SectionsPayload | null;

  version?: string;
  debug?: any;
};

type ApiResponse = { ok: boolean; data?: ResultData; error?: string };

function safeText(x: any): string {
  if (typeof x === "string") return x;
  if (Array.isArray(x)) return x.map(String).join(" ");
  if (x == null) return "";
  return String(x);
}

function pctLabel(v: number | undefined) {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 0;
  return `${Math.round(n * 100)}%`;
}

function fullName(first?: string | null, last?: string | null) {
  const f = (first || "").trim();
  const l = (last || "").trim();
  const out = `${f} ${l}`.trim();
  return out || "Participant";
}

function normaliseId(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\-]+/g, "-")
    .replace(/\-+/g, "-");
}

function sectionKey(s: ReportSection): string {
  const id = safeText(s.id).trim();
  if (id) return `id:${id.toLowerCase()}`;
  const t = safeText(s.title).trim();
  return `title:${t.toLowerCase()}`;
}

function findWelcomeIndex(sections: ReportSection[]) {
  const idx = sections.findIndex((s) => {
    const id = (s.id || "").toLowerCase();
    const title = (s.title || "").toLowerCase();
    return (
      id.includes("welcome") ||
      title.includes("welcome from daniel") ||
      title.includes("welcome from daniel acutt")
    );
  });
  return idx;
}

function isPlaceholderLine(text: string) {
  // Matches "{{SOMETHING}}" or "{{ SOME_THING }}" (common template tokens)
  const t = (text || "").trim();
  return /^\{\{\s*[\w\.\-\_]+\s*\}\}$/.test(t);
}

function Donut(props: { value: number; label: string }) {
  const v = Math.max(0, Math.min(1, props.value || 0));
  const size = 120;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * v;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(15, 23, 42, 0.15)"
          strokeWidth={stroke}
          fill="white"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgb(37, 99, 235)"
          strokeWidth={stroke}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="49%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize="20"
          fontWeight="700"
          fill="#0f172a"
        >
          {Math.round(v * 100)}%
        </text>
        <text
          x="50%"
          y="64%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize="10"
          fontWeight="700"
          fill="#64748b"
          letterSpacing="0.18em"
        >
          FREQUENCY
        </text>
      </svg>

      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {props.label}
        </div>
        <div className="mt-1 text-sm text-slate-700">Your dominant frequency</div>
      </div>
    </div>
  );
}

function BlockRenderer({ block }: { block: SectionBlock }) {
  const type = String((block as any)?.type || "").toLowerCase();

  if (type === "divider") {
    return <hr className="my-5 border-slate-200" />;
  }

  if (type === "h1") {
    return (
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        {safeText((block as any).text)}
      </h1>
    );
  }

  if (type === "h2") {
    return (
      <h2 className="text-xl font-semibold tracking-tight text-slate-900">
        {safeText((block as any).text)}
      </h2>
    );
  }

  if (type === "h3") {
    return (
      <h3 className="text-lg font-semibold text-slate-900">
        {safeText((block as any).text)}
      </h3>
    );
  }

  if (type === "h4") {
    return (
      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        {safeText((block as any).text)}
      </h4>
    );
  }

  if (type === "p") {
    const t = safeText((block as any).text);
    if (isPlaceholderLine(t)) {
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-600">Template placeholder</p>
          <p className="mt-1 text-xs text-slate-500">{t}</p>
        </div>
      );
    }
    return <p className="text-sm leading-relaxed text-slate-700">{t}</p>;
  }

  if (type === "ul") {
    const items = Array.isArray((block as any).items) ? (block as any).items : [];
    return (
      <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
        {items.map((it: any, i: number) => (
          <li key={i}>{safeText(it)}</li>
        ))}
      </ul>
    );
  }

  if (type === "ol") {
    const items = Array.isArray((block as any).items) ? (block as any).items : [];
    return (
      <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-1">
        {items.map((it: any, i: number) => (
          <li key={i}>{safeText(it)}</li>
        ))}
      </ol>
    );
  }

  if (type === "quote") {
    const t = safeText((block as any).text);
    const cite = safeText((block as any).cite);
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm italic text-slate-700">“{t}”</p>
        {cite ? <p className="mt-2 text-xs text-slate-500">— {cite}</p> : null}
      </div>
    );
  }

  // Unknown block type: fail soft but don't dump raw JSON into the report.
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs font-semibold text-amber-900">
        Unsupported block type: {String((block as any).type || "unknown")}
      </p>
    </div>
  );
}

export default function LegacyReportClient(props: { token: string; tid: string }) {
  const { token, tid } = props;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ResultData | null>(null);

  const [redirecting, setRedirecting] = useState(false);

  const reportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setErr(null);

        if (!tid) {
          setErr("Missing tid");
          setLoading(false);
          return;
        }

        const base = await getBaseUrl();
        const url = `${base}/api/public/test/${encodeURIComponent(token)}/report?tid=${encodeURIComponent(
          tid
        )}`;

        const res = await fetch(url, { cache: "no-store" });
        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
        }

        const json = (await res.json()) as ApiResponse;
        if (!res.ok || json.ok === false || !json.data) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }

        if (cancelled) return;
        setData(json.data);
        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        setErr(String(e?.message || e));
        setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token, tid]);

  // Hidden results / redirect handling
  useEffect(() => {
    if (!data) return;

    const showResults = data.link?.show_results ?? true;
    if (showResults) return;

    const redirectUrl = (data.link?.redirect_url || "").trim();
    if (!redirectUrl) return;

    setRedirecting(true);
    window.location.assign(redirectUrl);
  }, [data]);

  const mergedSections = useMemo(() => {
    const common = (data?.sections?.common || []) as ReportSection[];
    const profile = (data?.sections?.profile || []) as ReportSection[];

    const all = [...common, ...profile].filter(Boolean);

    // De-dupe by id/title key (stable)
    const seen = new Set<string>();
    const deduped: ReportSection[] = [];
    for (const s of all) {
      const k = sectionKey(s);
      if (seen.has(k)) continue;
      seen.add(k);
      deduped.push(s);
    }

    // Force Welcome to first if present
    const idx = findWelcomeIndex(deduped);
    if (idx > 0) {
      const welcome = deduped[idx];
      deduped.splice(idx, 1);
      deduped.unshift(welcome);
    }

    return deduped;
  }, [data]);

  const quickIndex = useMemo(() => {
    const out: Array<{ id: string; title: string }> = [];

    for (const s of mergedSections) {
      const title = safeText(s.title).trim();
      if (!title) continue;

      const id = safeText(s.id).trim() || normaliseId(title);
      out.push({ id, title });
    }

    // Stable de-dupe by id (keeps first occurrence)
    const seen = new Set<string>();
    const deduped: Array<{ id: string; title: string }> = [];
    for (const row of out) {
      const k = row.id.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      deduped.push(row);
    }

    return deduped;
  }, [mergedSections]);

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

      const safeName = `${(data?.test_name || "mindcanvas")
        .toLowerCase()
        .replace(/\s+/g, "-")}-${(data?.taker?.first_name || "report")
        .toLowerCase()
        .replace(/\s+/g, "-")}.pdf`;

      pdf.save(safeName);
    } finally {
      window.scrollTo(0, prevScroll);
    }
  }

  function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!tid) {
    return (
      <div className="min-h-screen bg-[#050914] text-white">
        <AppBackground />
        <main className="relative z-10 mx-auto max-w-4xl p-6">
          <h1 className="text-2xl font-semibold">Personalised report</h1>
          <p className="mt-4 text-sm text-slate-300">
            This page expects a <code>?tid=</code> parameter.
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

  if (err || !data) {
    return (
      <div className="min-h-screen bg-[#050914] text-white">
        <AppBackground />
        <main className="relative z-10 mx-auto max-w-4xl p-6 space-y-4">
          <h1 className="text-2xl font-semibold">Personalised report</h1>
          <p className="text-sm text-red-400">Could not load your report.</p>
          <details className="rounded-lg border border-slate-700 bg-slate-950 p-4 text-xs text-slate-50">
            <summary className="cursor-pointer font-medium">Debug information</summary>
            <div className="mt-2 space-y-2">
              <div>Error: {err ?? "Unknown"}</div>
            </div>
          </details>
        </main>
      </div>
    );
  }

  // Hidden results message (when show_results = false and no redirect_url)
  const showResults = data.link?.show_results ?? true;
  const hiddenMessage = (data.link?.hidden_results_message || "").trim();
  const redirectUrl = (data.link?.redirect_url || "").trim();

  if (!showResults) {
    if (redirecting && redirectUrl) {
      return (
        <div className="min-h-screen bg-[#050914] text-white">
          <AppBackground />
          <main className="relative z-10 mx-auto max-w-3xl px-4 py-10 space-y-3">
            <h1 className="text-2xl font-semibold">Thanks — redirecting…</h1>
            <p className="text-sm text-slate-300">Taking you to the next step now.</p>
          </main>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#050914] text-white">
        <AppBackground />
        <main className="relative z-10 mx-auto max-w-3xl px-4 py-10 space-y-4">
          <h1 className="text-2xl font-semibold">Thank you</h1>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-200 whitespace-pre-wrap">
              {hiddenMessage ||
                "Thank you for completing this assessment. Your facilitator will share your insights with you next."}
            </p>
          </div>
        </main>
      </div>
    );
  }

  const participant = fullName(data.taker?.first_name, data.taker?.last_name);

  const reportTitle = data.sections?.report_title || data.test_name || "Personalised report";

  // If org_name is null, don’t pretend test_name is an org
  const hasOrgName = Boolean((data.org_name || "").trim());
  const orgNameLabel = hasOrgName ? "Organisation" : "Test";
  const orgNameValue = hasOrgName ? (data.org_name as string) : data.test_name;

  const nextStepsUrl = (data.link?.next_steps_url || "").trim();
  const hasNextSteps = Boolean(nextStepsUrl);

  // Dominant frequency
  const topFreqCode = data.top_freq;
  const topFreqPct = data.frequency_percentages?.[topFreqCode] ?? 0;
  const topFreqName =
    data.frequency_labels.find((f) => f.code === topFreqCode)?.name || topFreqCode;

  // profile sorting
  const sortedProfiles = [...data.profile_labels]
    .map((p) => ({ ...p, pct: data.profile_percentages?.[p.code] ?? 0 }))
    .sort((a, b) => (b.pct || 0) - (a.pct || 0));

  const primary = sortedProfiles[0];
  const secondary = sortedProfiles[1];
  const tertiary = sortedProfiles[2];

  return (
    <div ref={reportRef} className="relative min-h-screen bg-[#050914] text-white overflow-hidden">
      <AppBackground />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 md:px-6">
        {/* Header */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
            Personalised report
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{reportTitle}</h1>
          <p className="mt-2 text-sm text-slate-200">
            For {participant} · {orgNameLabel}: {orgNameValue}
          </p>
          <p className="mt-1 text-sm text-slate-200">
            Top profile: <span className="font-semibold">{data.top_profile_name}</span>
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Download PDF
            </button>

            {hasNextSteps && (
              <button
                onClick={() => window.open(nextStepsUrl, "_blank", "noopener,noreferrer")}
                className="inline-flex items-center rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
              >
                Next steps
              </button>
            )}
          </div>
        </div>

        {/* Top summary row */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {/* Frequencies */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Frequencies</h2>

            {/* White content container */}
            <div className="mt-4 rounded-xl bg-white p-4 text-slate-900">
              <Donut value={topFreqPct} label={topFreqName} />

              <div className="mt-4 space-y-2">
                {data.frequency_labels.map((f) => (
                  <div key={f.code} className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {f.name} ({f.code})
                    </span>
                    <span className="text-slate-700">{pctLabel(data.frequency_percentages?.[f.code])}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Profiles */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Top profile mix</h2>
            <p className="mt-2 text-sm text-slate-200">
              Primary: <span className="font-semibold">{primary?.name}</span> · Secondary:{" "}
              <span className="font-semibold">{secondary?.name}</span> · Tertiary:{" "}
              <span className="font-semibold">{tertiary?.name}</span>
            </p>

            {/* White content container */}
            <div className="mt-4 rounded-xl bg-white p-4 text-slate-900">
              <div className="space-y-3">
                {sortedProfiles.map((p) => {
                  const pct = Math.max(0, Math.min(1, p.pct || 0));
                  return (
                    <div key={p.code}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">{p.name}</span>
                        <span className="text-slate-700">{pctLabel(p.pct)}</span>
                      </div>
                      <div className="mt-1 h-2 w-full rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-slate-900"
                          style={{ width: `${Math.round(pct * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Body layout: left quick index + right content */}
        <div className="mt-6 grid gap-4 md:grid-cols-[280px_1fr]">
          {/* Quick index */}
          <aside className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Quick index</p>
            <p className="mt-1 text-xs text-slate-300">Jump straight to the section you need.</p>

            <div className="mt-4 space-y-2">
              {quickIndex.slice(0, 40).map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => scrollToSection(s.id)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-white">{s.title}</div>
                    </div>
                    <div className="text-xs text-slate-300">View</div>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          {/* Main content */}
          <main className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-lg font-semibold">Core sections</h2>
              {data?.sections?.profile_missing ? (
                <p className="mt-1 text-xs text-amber-200">
                  Note: profile-specific sections are missing for this profile in the storage framework.
                </p>
              ) : null}
            </div>

            {mergedSections.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm text-slate-200">
                  No sections were returned for this report. (Usually means the storage framework file is missing
                  content or the report route didn’t attach sections.profile.)
                </p>
              </div>
            ) : null}

            {mergedSections.map((section, idx) => {
              const id = safeText(section.id).trim() || normaliseId(safeText(section.title) || `section-${idx}`);
              const title = safeText(section.title);

              return (
                <section key={`${id}-${idx}`} id={id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  {/* White container inside */}
                  <div className="rounded-2xl bg-white p-6 text-slate-900">
                    {title ? <h2 className="text-xl font-semibold text-slate-900">{title}</h2> : null}

                    <div className={title ? "mt-4 space-y-3" : "space-y-3"}>
                      {(section.blocks || []).map((b, i) => (
                        <BlockRenderer key={i} block={b} />
                      ))}
                    </div>
                  </div>
                </section>
              );
            })}

            {/* Bottom actions */}
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={handleDownloadPdf}
                className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                Download PDF
              </button>

              {hasNextSteps && (
                <button
                  onClick={() => window.open(nextStepsUrl, "_blank", "noopener,noreferrer")}
                  className="inline-flex items-center rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
                >
                  Next steps
                </button>
              )}
            </div>

            <footer className="pt-4 text-xs text-slate-400">© {new Date().getFullYear()} MindCanvas</footer>
          </main>
        </div>
      </div>
    </div>
  );
}
