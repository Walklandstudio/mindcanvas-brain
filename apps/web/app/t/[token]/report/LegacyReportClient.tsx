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

type SectionsShape = Section[] | Record<string, Section[]>;

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

// ---------------- helpers ----------------

function safeText(v: any): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function pct01(n: number | undefined): number {
  if (!n || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

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
  if (key === "common") return "Core sections";
  if (key.includes("frequency")) return "Frequency sections";
  if (key.includes("profile")) return "Profile sections";
  if (key.includes("next")) return "Next steps";
  return k.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function slugify(s: string): string {
  return (s || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isContentsSectionTitle(title?: string): boolean {
  const t = (title || "").trim().toLowerCase();
  return t === "contents of this report" || t === "contents" || t === "table of contents";
}

function isIntroLetterSectionTitle(title?: string): boolean {
  const t = (title || "").trim().toLowerCase();
  return t.startsWith("welcome from");
}

function looksLikeProfileDeepDiveTitle(title: string, topProfileName: string): boolean {
  const t = (title || "").trim().toLowerCase();
  const p = (topProfileName || "").trim().toLowerCase();
  if (!t) return false;
  if (p && t.includes(p)) return true;
  if (t.includes("operating style") || t.includes("in depth")) return true;
  if (t.includes("your profile") || t.includes("your style")) return true;
  return false;
}

function whiteCardClass(): string {
  // White containers like your other reports
  return "rounded-2xl border border-slate-200 bg-white p-6 md:p-7 shadow-sm";
}

function darkSidebarCardClass(): string {
  return "rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)]";
}

// ---------------- blocks ----------------

function BlockRenderer({ block }: { block: Block }) {
  const type = block?.type;

  if (type === "divider") return <hr className="my-6 border-slate-200" />;

  if (type === "h1") return <h1 className="text-2xl font-semibold text-slate-900">{safeText((block as any).text)}</h1>;
  if (type === "h2") return <h2 className="text-xl font-semibold text-slate-900">{safeText((block as any).text)}</h2>;
  if (type === "h3") return <h3 className="text-lg font-semibold text-slate-900">{safeText((block as any).text)}</h3>;

  // ✅ h4 used heavily in LEAD content as sub-headers
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

  // keep unknown visible (dev safety)
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs text-amber-800">Unsupported block type: {safeText(type)}</p>
      <pre className="mt-2 overflow-auto text-xs text-slate-700">{JSON.stringify(block, null, 2)}</pre>
    </div>
  );
}

// ---------------- charts ----------------

function FrequencyDonut(props: {
  labels: FrequencyLabel[];
  values: Record<FrequencyCode, number>;
  size?: number;
}) {
  const size = props.size ?? 140;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  const segments = props.labels.map((l) => ({
    code: l.code,
    name: l.name,
    v: pct01(props.values[l.code]),
  }));

  let acc = 0;
  const rings = segments.map((s) => {
    const dash = s.v * c;
    const gap = c - dash;
    const offset = c * (1 - acc);
    acc += s.v;
    return { ...s, dash, gap, offset };
  });

  const colorMap: Record<FrequencyCode, string> = {
    A: "#38bdf8",
    B: "#34d399",
    C: "#a78bfa",
    D: "#f59e0b",
  };

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        {rings.map((seg) => (
          <circle
            key={seg.code}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={colorMap[seg.code]}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${seg.dash} ${seg.gap}`}
            strokeDashoffset={seg.offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ))}
        <circle cx={size / 2} cy={size / 2} r={r - stroke / 2} fill="#0b1220" opacity="0.06" />
        <text x="50%" y="48%" textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="700" letterSpacing="1.5">
          LEAD
        </text>
        <text x="50%" y="60%" textAnchor="middle" fill="#334155" fontSize="9">
          Frequencies
        </text>
      </svg>

      <div className="space-y-2">
        {segments.map((s) => (
          <div key={s.code} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorMap[s.code] }} />
              <span className="text-slate-800">
                {s.name} <span className="text-slate-500">({s.code})</span>
              </span>
            </div>
            <span className="text-slate-700">{Math.round(s.v * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- component ----------------

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

  const sectionGroupsRaw = useMemo(() => normaliseSections(data?.sections ?? null), [data?.sections]);

  const participantName = data ? getFullName(data.taker) : "Participant";
  const orgName = data ? data.org_name || data.test_name || data.org_slug : "";
  const nextStepsUrl = (data?.link?.next_steps_url || "").trim();
  const hasNextSteps = Boolean(nextStepsUrl);

  const allSections = useMemo(() => {
    const out: Array<{ groupKey: string; section: Section }> = [];
    for (const g of sectionGroupsRaw) for (const s of g.sections) out.push({ groupKey: g.groupKey, section: s });
    return out;
  }, [sectionGroupsRaw]);

  const introSection = useMemo(() => {
    return allSections.find((x) => isIntroLetterSectionTitle(x.section.title));
  }, [allSections]);

  // detect if we have a real profile deep dive section coming from storage
  const hasProfileDeepDive = useMemo(() => {
    if (!data) return false;
    const top = data.top_profile_name || "";
    return allSections.some((x) => {
      const title = (x.section.title || "").trim();
      return looksLikeProfileDeepDiveTitle(title, top);
    });
  }, [allSections, data]);

  const indexItems = useMemo(() => {
    const items: Array<{ id: string; title: string; groupKey: string }> = [];
    for (const x of allSections) {
      const title = (x.section.title || "").trim();
      if (!title) continue;
      if (isContentsSectionTitle(title)) continue;
      if (introSection?.section?.title && title === introSection.section.title) continue;

      const id = x.section.id ? slugify(x.section.id) : slugify(title);
      items.push({ id: id || slugify(title) || `section-${items.length + 1}`, title, groupKey: x.groupKey });
    }

    // If storage did not return a profile deep dive section, ensure a nav target exists
    if (data && !hasProfileDeepDive) {
      items.splice(1, 0, {
        id: "your-operating-style",
        title: `Your Operating Style in Depth: ${data.top_profile_name}`,
        groupKey: "generated",
      });
    }

    return items;
  }, [allSections, introSection, data, hasProfileDeepDive]);

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

  function scrollToId(id: string) {
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

  const sortedProfiles = [...data.profile_labels]
    .map((p) => ({ ...p, pct: data.profile_percentages[p.code] ?? 0 }))
    .sort((a, b) => (b.pct || 0) - (a.pct || 0));

  const primary = sortedProfiles[0];
  const secondary = sortedProfiles[1];
  const tertiary = sortedProfiles[2];

  const renderGroups = sectionGroupsRaw.map((g) => {
    const filtered = g.sections.filter((s) => {
      const title = (s.title || "").trim();
      if (title && isContentsSectionTitle(title)) return false;
      if (introSection?.section?.title && title === introSection.section.title) return false;
      return true;

    });
    return { ...g, sections: filtered };
  });

  // Generated “profile deep dive” fallback if storage doesn’t include it
  const GeneratedProfileDeepDive = () => {
    const topName = data.top_profile_name;
    const topFreq = data.top_freq;

    const freqLabel = data.frequency_labels.find((f) => f.code === topFreq)?.name || topFreq;

    const secondaryText = secondary?.name ? `, supported by ${secondary.name}` : "";
    const tertiaryText = tertiary?.name ? ` and ${tertiary.name}` : "";

    return (
      <article id="your-operating-style" className={whiteCardClass()}>
        <h3 className="text-lg font-semibold text-slate-900">Your Operating Style in Depth: {topName}</h3>

        <div className="mt-4 space-y-3">
          <p className="text-sm leading-relaxed text-slate-700">
            Your dominant operating style is <span className="font-semibold">{topName}</span>. This is the pattern you
            default to when you’re most yourself — especially under pressure or when it matters.
          </p>

          <p className="text-sm leading-relaxed text-slate-700">
            Your strongest LEAD approach is <span className="font-semibold">{freqLabel}</span> ({topFreq}). That shapes
            how you naturally initiate, decide, and drive momentum.
          </p>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Your mix</p>
            <p className="mt-2 text-sm text-slate-700">
              Primary: <span className="font-semibold">{primary?.name}</span>
              {secondaryText}
              {tertiaryText}.
            </p>
          </div>

          <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Strengths to lean into</h4>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Use your natural strengths deliberately — don’t apologise for the way you create value.</li>
            <li>Communicate your intent early, so people can follow your direction without guessing.</li>
            <li>Build simple routines that protect your energy and stop overextension.</li>
          </ul>

          <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Watch-outs</h4>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>When stressed, your dominant style can become overused — and it can crowd out other approaches.</li>
            <li>People with different styles may interpret your speed/precision/structure differently than you intend.</li>
            <li>Balance your strengths by partnering with someone strong in your lower-percentage areas.</li>
          </ul>

          <p className="text-sm leading-relaxed text-slate-700">
            If your stored report sections already include a detailed profile write-up, we’ll show that instead of this
            fallback. This ensures the report never feels “missing” the core profile content again.
          </p>
        </div>
      </article>
    );
  };

  return (
    <div ref={reportRef} className="relative min-h-screen bg-[#050914] text-white overflow-hidden">
      <AppBackground />

      <div className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-8 md:px-6">
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
          </header>

          {/* LAYOUT */}
          <div className="mt-8 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            {/* SIDEBAR */}
            <aside className="lg:sticky lg:top-6 h-fit">
              <div className={darkSidebarCardClass()}>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Quick index</p>
                  <p className="text-xs text-slate-400">
                    Jump straight to the section you need during calls, campaigns or copywriting.
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  {indexItems.length === 0 ? (
                    <div className="text-sm text-slate-300">No sections found.</div>
                  ) : (
                    indexItems.map((it, idx) => (
                      <button
                        key={it.id}
                        onClick={() => scrollToId(it.id)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10 transition"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-slate-200">
                              {idx + 1}
                            </span>
                            <span className="text-sm font-medium text-slate-100">{it.title}</span>
                          </div>
                          <span className="text-xs text-slate-400">View</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  {hasNextSteps && (
                    <button
                      onClick={() => window.open(nextStepsUrl, "_blank", "noopener,noreferrer")}
                      className="inline-flex items-center justify-center rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-500/15"
                    >
                      Next steps
                    </button>
                  )}
                  <button
                    onClick={handleDownloadPdf}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-500 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50 hover:bg-slate-800"
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            </aside>

            {/* MAIN */}
            <main className="space-y-6">
              {/* ✅ Welcome letter FIRST (top of page content) */}
              {introSection?.section ? (
                <section className={whiteCardClass()}>
                  <h2 className="text-lg font-semibold text-slate-900">{safeText(introSection.section.title || "Welcome")}</h2>

                  {Array.isArray(introSection.section.blocks) && introSection.section.blocks.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {introSection.section.blocks.map((b: any, i: number) => (
                        <BlockRenderer key={i} block={b} />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-600">No intro content found.</p>
                  )}
                </section>
              ) : null}

              {/* Score summary */}
              <section className="grid gap-4 md:grid-cols-2">
                <div className={whiteCardClass()}>
                  <h2 className="text-lg font-semibold text-slate-900">Frequencies</h2>
                  <p className="mt-2 text-sm text-slate-600">Your energy distribution across the four LEAD approaches.</p>
                  <div className="mt-5">
                    <FrequencyDonut labels={data.frequency_labels} values={data.frequency_percentages} />
                  </div>
                </div>

                <div className={whiteCardClass()}>
                  <h2 className="text-lg font-semibold text-slate-900">Top profile mix</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Primary: <span className="font-semibold text-slate-900">{primary?.name}</span>
                    {secondary?.name ? (
                      <>
                        {" · "}Secondary: <span className="font-semibold text-slate-900">{secondary.name}</span>
                      </>
                    ) : null}
                    {tertiary?.name ? (
                      <>
                        {" · "}Tertiary: <span className="font-semibold text-slate-900">{tertiary.name}</span>
                      </>
                    ) : null}
                  </p>

                  <div className="mt-4 space-y-3">
                    {data.profile_labels.map((p) => {
                      const v = pct01(data.profile_percentages[p.code]);
                      const pc = v * 100;
                      return (
                        <div key={p.code} className="grid grid-cols-12 items-center gap-3">
                          <div className="col-span-4 text-sm text-slate-800">{p.name}</div>
                          <div className="col-span-8">
                            <div className="h-2 w-full rounded-full bg-slate-200">
                              <div className="h-2 rounded-full bg-sky-600" style={{ width: `${pc.toFixed(0)}%` }} />
                            </div>
                            <div className="mt-1 text-xs text-slate-500">{pc.toFixed(0)}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* ✅ Ensure we always have a profile deep dive section */}
              {!hasProfileDeepDive ? <GeneratedProfileDeepDive /> : null}

              {/* Remaining sections */}
              {renderGroups
                .filter((g) => (g.sections || []).length > 0)
                .map((g) => (
                  <section key={g.groupKey} className="space-y-4">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                      {titleForGroupKey(g.groupKey)}
                    </h2>

                    {g.sections.map((s, idx) => {
                      const title = (s.title || "").trim();
                      const id = s.id ? slugify(s.id) : slugify(title);
                      const anchorId = id || slugify(title) || `${g.groupKey}-${idx}`;

                      return (
                        <article id={anchorId} key={s.id || `${g.groupKey}-${idx}`} className={whiteCardClass()}>
                          {title ? <h3 className="text-lg font-semibold text-slate-900">{safeText(title)}</h3> : null}

                          {Array.isArray(s.blocks) && s.blocks.length > 0 ? (
                            <div className="mt-4 space-y-3">
                              {s.blocks.map((b: any, i: number) => (
                                <BlockRenderer key={i} block={b} />
                              ))}
                            </div>
                          ) : (
                            <div className="mt-4 text-sm text-slate-600">No blocks found for this section.</div>
                          )}
                        </article>
                      );
                    })}
                  </section>
                ))}

              <footer className="mt-8 flex items-center justify-between border-t border-slate-800 pt-6">
                <p className="text-xs text-slate-400">© {new Date().getFullYear()} MindCanvas</p>
                <div className="flex items-center gap-3">
                  {hasNextSteps && (
                    <button
                      onClick={() => window.open(nextStepsUrl, "_blank", "noopener,noreferrer")}
                      className="inline-flex items-center rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-500/15"
                    >
                      Next steps
                    </button>
                  )}
                  <button
                    onClick={handleDownloadPdf}
                    className="inline-flex items-center rounded-lg border border-slate-500 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50 hover:bg-slate-800"
                  >
                    Download PDF
                  </button>
                </div>
              </footer>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}


