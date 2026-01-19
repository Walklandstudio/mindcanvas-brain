// apps/web/app/t/[token]/report/LegacyReportClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppBackground from "@/components/ui/AppBackground";
import { getBaseUrl } from "@/lib/server-url";

type AB = "A" | "B" | "C" | "D";

type FrequencyLabel = { code: AB; name: string };
type ProfileLabel = { code: string; name: string };

type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "h4"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: string; [k: string]: any };

type Section = {
  id: string;
  title: string;
  blocks: Block[];
};

type SectionsPayload = {
  common: Section[] | null;
  profile: Section[] | null;
  report_title?: string | null;

  // optional debug fields used by API
  profile_missing?: boolean;
  framework_version?: string | null;
  framework_bucket?: string | null;
  framework_path?: string | null;
};

type ReportApi = {
  ok: boolean;
  data?: {
    org_slug: string;
    org_name?: string | null;
    test_name: string;
    taker: { id: string; first_name?: string | null; last_name?: string | null };

    link?: any;

    frequency_labels: FrequencyLabel[];
    frequency_totals: Record<AB, number>;
    frequency_percentages: Record<AB, number>; // 0..1

    profile_labels: ProfileLabel[];
    profile_totals: Record<string, number>;
    profile_percentages: Record<string, number>; // 0..1

    top_freq: AB;
    top_profile_code: string;
    top_profile_name: string;

    sections: SectionsPayload | null;

    debug?: any;
    version?: string;
  };
  error?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pct01ToPct100(n: number) {
  if (!Number.isFinite(n)) return 0;
  return clamp(n * 100, 0, 100);
}

function safeText(s: any) {
  return String(s ?? "").trim();
}

function normaliseSectionId(id: string) {
  return safeText(id)
    .toLowerCase()
    .replace(/[^\w-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getNextStepsUrl(link: any): string | null {
  if (!link) return null;
  const candidates = [
    link.next_steps_url,
    link.nextStepsUrl,
    link.next_steps,
    link.nextSteps,
    link.cta_url,
    link.ctaUrl,
    link.url,
  ];
  for (const c of candidates) {
    const v = safeText(c);
    if (v && /^https?:\/\//i.test(v)) return v;
  }
  return null;
}

// --- Donut (SVG) -----------------------------------------------------------

function Donut(props: {
  valuePct: number; // 0..100
  label: string;
  sublabel?: string;
}) {
  const { valuePct, label, sublabel } = props;
  const size = 140;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  const pct = clamp(valuePct, 0, 100);
  const dash = (pct / 100) * c;
  const gap = c - dash;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(15, 23, 42, 0.10)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(37, 99, 235, 0.85)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="48%"
          textAnchor="middle"
          className="fill-slate-900"
          style={{ fontSize: 24, fontWeight: 700 }}
        >
          {Math.round(pct)}%
        </text>
        <text
          x="50%"
          y="62%"
          textAnchor="middle"
          className="fill-slate-600"
          style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1 }}
        >
          FREQUENCY
        </text>
      </svg>

      <div>
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        {sublabel ? <div className="mt-1 text-xs text-slate-600">{sublabel}</div> : null}
      </div>
    </div>
  );
}

// --- Blocks renderer --------------------------------------------------------

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((b, idx) => {
        const t = String(b.type || "").toLowerCase();

        if (t === "p") {
          const text = safeText((b as any).text);
          if (!text) return null;
          return (
            <p key={idx} className="text-sm leading-7 text-slate-700 whitespace-pre-line">
              {text}
            </p>
          );
        }

        if (t === "h2") {
          const text = safeText((b as any).text);
          if (!text) return null;
          return (
            <h2 key={idx} className="text-xl font-semibold text-slate-900">
              {text}
            </h2>
          );
        }

        if (t === "h3") {
          const text = safeText((b as any).text);
          if (!text) return null;
          return (
            <h3 key={idx} className="text-lg font-semibold text-slate-900">
              {text}
            </h3>
          );
        }

        // ✅ Fix: support h4 (your framework uses h4 a lot)
        if (t === "h4") {
          const text = safeText((b as any).text);
          if (!text) return null;
          return (
            <h4 key={idx} className="text-base font-semibold text-slate-900">
              {text}
            </h4>
          );
        }

        if (t === "ul") {
          const items = Array.isArray((b as any).items) ? (b as any).items : [];
          if (!items.length) return null;
          return (
            <ul key={idx} className="list-disc pl-5 text-sm leading-7 text-slate-700 space-y-1">
              {items.map((it: string, j: number) => (
                <li key={j} className="whitespace-pre-line">
                  {safeText(it)}
                </li>
              ))}
            </ul>
          );
        }

        if (t === "ol") {
          const items = Array.isArray((b as any).items) ? (b as any).items : [];
          if (!items.length) return null;
          return (
            <ol key={idx} className="list-decimal pl-5 text-sm leading-7 text-slate-700 space-y-1">
              {items.map((it: string, j: number) => (
                <li key={j} className="whitespace-pre-line">
                  {safeText(it)}
                </li>
              ))}
            </ol>
          );
        }

        // fallback (do not dump raw JSON in the UI)
        return null;
      })}
    </div>
  );
}

// --- Main component ---------------------------------------------------------

export default function LegacyReportClient(props: { token: string; tid: string }) {
  const { token, tid } = props;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<NonNullable<ReportApi["data"]> | null>(null);

  const reportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErr(null);

        const base = await getBaseUrl();
        if (cancelled) return;

        const url = `${base}/api/public/test/${encodeURIComponent(token)}/report?tid=${encodeURIComponent(
          tid,
        )}`;

        const res = await fetch(url, { cache: "no-store" });
        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
        }

        const json = (await res.json()) as ReportApi;
        if (!res.ok || !json.ok || !json.data) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }

        if (cancelled) return;
        setData(json.data);
      } catch (e: any) {
        if (cancelled) return;
        setErr(String(e?.message || e));
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token, tid]);

  // Build the “report sections” we will render:
  // - Put “Welcome from Daniel Acutt” at the top
  // - Then render the rest of common + profile
  const mergedSections = useMemo(() => {
    const sec = data?.sections;
    const common = Array.isArray(sec?.common) ? sec!.common! : [];
    const profile = Array.isArray(sec?.profile) ? sec!.profile! : [];

    // Some frameworks store the profile deep-dive in common; some put it in profile.
    // We render both, but we ensure Welcome goes first.
    const all = [...common, ...profile].filter(Boolean);

    const norm = all.map((s) => ({
      ...s,
      id: normaliseSectionId(s.id || s.title),
    }));

    const welcomeIdx = norm.findIndex(
      (s) =>
        s.id === "welcome-from-daniel-acutt" ||
        safeText(s.title).toLowerCase().includes("welcome from daniel"),
    );

    if (welcomeIdx > 0) {
      const welcome = norm[welcomeIdx];
      const rest = norm.filter((_, i) => i !== welcomeIdx);
      return [welcome, ...rest];
    }

    return norm;
  }, [data]);

  // Sidebar index
  const indexItems = useMemo(() => {
    return mergedSections.map((s, i) => ({
      n: i + 1,
      id: s.id,
      title: s.title || s.id,
    }));
  }, [mergedSections]);

  const takerName = useMemo(() => {
    const fn = safeText(data?.taker?.first_name);
    const ln = safeText(data?.taker?.last_name);
    const full = `${fn} ${ln}`.trim();
    return full || "Test taker";
  }, [data]);

  const nextStepsUrl = useMemo(() => getNextStepsUrl(data?.link), [data]);

  const topFreqLabel = useMemo(() => {
    if (!data) return "";
    const hit = data.frequency_labels.find((f) => f.code === data.top_freq);
    return hit?.name || data.top_freq;
  }, [data]);

  const freqPct = useMemo(() => {
    if (!data) return 0;
    return pct01ToPct100(data.frequency_percentages?.[data.top_freq] ?? 0);
  }, [data]);

  const topProfiles = useMemo(() => {
    if (!data) return [];
    const entries = Object.entries(data.profile_percentages || {}).map(([code, p]) => ({
      code,
      pct: pct01ToPct100(Number(p)),
      name: data.profile_labels.find((x) => x.code === code)?.name || code,
    }));
    return entries.sort((a, b) => b.pct - a.pct).slice(0, 8);
  }, [data]);

  const primarySecondaryTertiary = useMemo(() => {
    const top3 = [...topProfiles].slice(0, 3);
    return {
      primary: top3[0]?.name ?? "",
      secondary: top3[1]?.name ?? "",
      tertiary: top3[2]?.name ?? "",
    };
  }, [topProfiles]);

  async function handleDownloadPdf() {
    try {
      const el = reportRef.current;
      if (!el) return;

      // dynamic import so we don’t bloat initial bundle
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#050914",
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "pt", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let y = 0;
      let remaining = imgHeight;

      pdf.addImage(imgData, "PNG", 0, y, imgWidth, imgHeight);

      remaining -= pageHeight;
      while (remaining > 0) {
        pdf.addPage();
        y = - (imgHeight - remaining);
        pdf.addImage(imgData, "PNG", 0, y, imgWidth, imgHeight);
        remaining -= pageHeight;
      }

      const filename = `${safeText(data?.test_name) || "report"}-${safeText(takerName) || "taker"}.pdf`
        .toLowerCase()
        .replace(/[^\w-]+/g, "-");

      pdf.save(filename);
    } catch (e) {
      console.error(e);
      alert("Could not generate the PDF. Please try again.");
    }
  }

  function scrollTo(id: string) {
    const el = document.getElementById(`sec-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050914] text-white">
        <AppBackground />
        <main className="relative z-10 mx-auto max-w-6xl px-6 py-10">
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
        <main className="relative z-10 mx-auto max-w-6xl px-6 py-10 space-y-4">
          <h1 className="text-2xl font-semibold">Personalised report</h1>
          <p className="text-sm text-red-300">Could not load your report.</p>
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

  return (
    <div className="min-h-screen bg-[#050914] text-white">
      <AppBackground />

      <div ref={reportRef} className="relative z-10 mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-7 py-6">
          <div className="text-xs tracking-[0.2em] text-slate-300">PERSONALISED REPORT</div>
          <div className="mt-2 text-3xl font-semibold">{data.test_name}</div>
          <div className="mt-2 text-sm text-slate-200">
            For <span className="font-semibold">{takerName}</span>
            <span className="text-slate-400"> · </span>
            Organisation: <span className="font-semibold">{data.test_name}</span>
          </div>
          <div className="mt-1 text-sm text-slate-200">
            Top profile: <span className="font-semibold">{data.top_profile_name}</span>
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadPdf}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white/90"
            >
              Download PDF
            </button>

            {nextStepsUrl ? (
              <a
                href={nextStepsUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Go to next steps
              </a>
            ) : null}
          </div>
        </div>

        {/* Top summary row */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Frequencies card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
            <div className="text-lg font-semibold">Frequencies</div>

            {/* White inner container (like your other reports) */}
            <div className="mt-4 rounded-2xl bg-white/95 p-5">
              <Donut
                valuePct={freqPct}
                label={`${topFreqLabel} (${data.top_freq})`}
                sublabel="Your dominant frequency"
              />

              <div className="mt-5 space-y-3">
                {data.frequency_labels.map((f) => {
                  const p = pct01ToPct100(data.frequency_percentages?.[f.code] ?? 0);
                  return (
                    <div key={f.code} className="flex items-center justify-between gap-4">
                      <div className="text-sm font-semibold text-slate-900">
                        {f.name} <span className="text-slate-500">({f.code})</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-700">{Math.round(p)}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Profile mix card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
            <div className="text-lg font-semibold">Top profile mix</div>

            <div className="mt-4 rounded-2xl bg-white/95 p-5">
              <div className="text-sm text-slate-700">
                Primary: <span className="font-semibold text-slate-900">{primarySecondaryTertiary.primary}</span>
                {primarySecondaryTertiary.secondary ? (
                  <>
                    <span className="text-slate-400"> · </span>
                    Secondary: <span className="font-semibold text-slate-900">{primarySecondaryTertiary.secondary}</span>
                  </>
                ) : null}
                {primarySecondaryTertiary.tertiary ? (
                  <>
                    <span className="text-slate-400"> · </span>
                    Tertiary: <span className="font-semibold text-slate-900">{primarySecondaryTertiary.tertiary}</span>
                  </>
                ) : null}
              </div>

              <div className="mt-4 space-y-3">
                {topProfiles.map((p) => (
                  <div key={p.code} className="grid grid-cols-[1fr_auto] items-center gap-4">
                    <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                    <div className="text-sm font-semibold text-slate-700">{Math.round(p.pct)}%</div>
                    <div className="col-span-2 h-2 w-full rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-slate-800/60"
                        style={{ width: `${clamp(p.pct, 0, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Body: sidebar + content */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-6 h-fit">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
              <div className="text-xs tracking-[0.2em] text-slate-300">QUICK INDEX</div>
              <div className="mt-2 text-sm text-slate-200">
                Jump straight to the section you need.
              </div>

              <div className="mt-4 space-y-2">
                {indexItems.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => scrollTo(it.id)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left hover:bg-white/10"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                          {it.n}
                        </div>
                        <div className="text-sm font-semibold">{it.title}</div>
                      </div>
                      <div className="text-xs text-slate-300">View</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Content */}
          <main className="space-y-6">
            <div className="text-lg font-semibold">Core sections</div>

            {data.sections?.profile_missing ? (
              <div className="rounded-2xl border border-amber-400/30 bg-amber-200/10 p-5 text-sm text-amber-100">
                Your report framework loaded, but the API says the profile-specific sections were missing.
                We’ll still render everything available.
              </div>
            ) : null}

            {mergedSections.map((sec) => (
              <section
                key={sec.id}
                id={`sec-${sec.id}`}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6"
              >
                {/* white inner container */}
                <div className="rounded-2xl bg-white/95 p-6">
                  <h2 className="text-xl font-semibold text-slate-900">{sec.title}</h2>
                  <div className="mt-4">
                    <Blocks blocks={Array.isArray(sec.blocks) ? sec.blocks : []} />
                  </div>
                </div>
              </section>
            ))}

            {/* Footer buttons (again, so they exist at the bottom like your other reports) */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={handleDownloadPdf}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white/90"
              >
                Download PDF
              </button>

              {nextStepsUrl ? (
                <a
                  href={nextStepsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Go to next steps
                </a>
              ) : null}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
