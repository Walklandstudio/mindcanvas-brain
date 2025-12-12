"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type PersonalityKey = "FIRE" | "FLOW" | "FORM" | "FIELD";
type MindsetKey = "ORIGIN" | "MOMENTUM" | "VECTOR" | "ORBIT" | "QUANTUM";

type PersonalityPercMap = Partial<Record<PersonalityKey, number>>;
type MindsetPercMap = Partial<Record<MindsetKey, number>>;

type QscResultsRow = {
  id: string;
  test_id: string;
  token: string;
  personality_totals: Record<string, number> | null;
  personality_percentages: PersonalityPercMap | null; // 0–100
  mindset_totals: Record<string, number> | null;
  mindset_percentages: MindsetPercMap | null; // 0–100
  primary_personality: PersonalityKey | null;
  secondary_personality: PersonalityKey | null;
  primary_mindset: MindsetKey | null;
  secondary_mindset: MindsetKey | null;
  combined_profile_code: string | null; // e.g. "FIELD_ORBIT"
  qsc_profile_id: string | null;
  audience: "entrepreneur" | "leader" | null;
  created_at: string;
};

type QscProfileRow = {
  id: string;
  personality_code: string | null;
  mindset_level: number | null;
  profile_code: string | null;
  profile_label: string | null;
  how_to_communicate: string | null;
  decision_style: string | null;
  business_challenges: string | null;
  trust_signals: string | null;
  offer_fit: string | null;
  sale_blockers: string | null;
};

type QscPersonaRow = {
  id: string;
  test_id: string;
  personality_code: string | null;
  mindset_level: string | number | null;
  profile_code: string | null;
  profile_label: string | null;

  show_up_summary: string | null;
  energisers: string | null;
  drains: string | null;
  communication_long: string | null;
  admired_for: string | null;
  stuck_points: string | null;

  one_page_strengths: string | null;
  one_page_risks: string | null;

  combined_strengths: string | null;
  combined_risks: string | null;
  combined_big_lever: string | null;

  emotional_stabilises: string | null;
  emotional_destabilises: string | null;
  emotional_patterns_to_watch: string | null;

  decision_style_long: string | null;
  support_yourself: string | null;

  strategic_priority_1: string | null;
  strategic_priority_2: string | null;
  strategic_priority_3: string | null;
};

type QscTakerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company: string | null;
  role_title: string | null;
};

type QscPayload = {
  results: QscResultsRow;
  profile: QscProfileRow | null;
  persona: QscPersonaRow | null;
  taker: QscTakerRow | null;
};

type MatrixCell = {
  personality: PersonalityKey;
  mindset: MindsetKey;
  label: string;
  code: string; // e.g. "A1".."D5"
};

type CellCategory = "primary" | "secondary" | "related" | "other";

const PERSONALITIES: { key: PersonalityKey; label: string; code: string }[] = [
  { key: "FIRE", label: "FIRE", code: "A" },
  { key: "FLOW", label: "FLOW", code: "B" },
  { key: "FORM", label: "FORM", code: "C" },
  { key: "FIELD", label: "FIELD", code: "D" },
];

const MINDSETS: { key: MindsetKey; label: string; level: number }[] = [
  { key: "ORIGIN", label: "ORIGIN", level: 1 },
  { key: "MOMENTUM", label: "MOMENTUM", level: 2 },
  { key: "VECTOR", label: "VECTOR", level: 3 },
  { key: "ORBIT", label: "ORBIT", level: 4 },
  { key: "QUANTUM", label: "QUANTUM", level: 5 },
];

function buildMatrix(): MatrixCell[] {
  const cells: MatrixCell[] = [];
  for (const m of MINDSETS) {
    for (const p of PERSONALITIES) {
      const code = `${p.code}${m.level}`;
      const label = `${p.label} ${m.label}`;
      cells.push({ personality: p.key, mindset: m.key, label, code });
    }
  }
  return cells;
}

const MATRIX = buildMatrix();

function classifyCell(result: QscResultsRow | null, cell: MatrixCell): CellCategory {
  if (!result) return "other";

  const combined = (result.combined_profile_code || "").toUpperCase();
  const primaryP = result.primary_personality;
  const secondaryP = result.secondary_personality;
  const primaryM = result.primary_mindset;
  const secondaryM = result.secondary_mindset;

  const cellCombined = `${cell.personality}_${cell.mindset}`.toUpperCase();

  if (combined && cellCombined === combined) return "primary";

  const matchesPrimaryCombo =
    (cell.personality === primaryP && cell.mindset === secondaryM) ||
    (cell.personality === secondaryP && cell.mindset === primaryM);

  if (matchesPrimaryCombo) return "secondary";

  const matchesPersonality =
    cell.personality === primaryP || cell.personality === secondaryP;
  const matchesMindset =
    cell.mindset === primaryM || cell.mindset === secondaryM;

  return matchesPersonality || matchesMindset ? "related" : "other";
}

function categoryClasses(cat: CellCategory): string {
  switch (cat) {
    case "primary":
      return "border-sky-400 bg-sky-500 text-slate-50 shadow-xl shadow-sky-900/60";
    case "secondary":
      return "border-sky-400/80 bg-sky-500/15 text-slate-50 shadow-md shadow-sky-900/40";
    case "related":
      return "border-sky-400/40 bg-sky-500/5 text-slate-100";
    case "other":
    default:
      return "border-slate-700/60 bg-slate-900/70 text-slate-400";
  }
}

function percentLabel(value: number | undefined | null): string {
  const v = typeof value === "number" ? value : 0;
  return `${v.toFixed(1).replace(/\.0$/, "")}%`;
}

function Bar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, isFinite(pct) ? pct : 0));
  const width = `${clamped}%`;
  return (
    <div className="w-full h-2 rounded-full bg-slate-800/90 overflow-hidden">
      <div className="h-2 rounded-full bg-sky-500" style={{ width }} />
    </div>
  );
}

type FrequencyDonutDatum = {
  key: PersonalityKey;
  label: string;
  value: number; // 0–100
};

const FREQUENCY_COLORS: Record<PersonalityKey, string> = {
  FIRE: "#f97316",
  FLOW: "#0ea5e9",
  FORM: "#22c55e",
  FIELD: "#a855f7",
};

function FrequencyDonut({ data }: { data: FrequencyDonutDatum[] }) {
  const total =
    data.reduce((sum, d) => sum + (isFinite(d.value) ? d.value : 0), 0) || 1;

  const radius = 60;
  const strokeWidth = 20;
  const center = 80;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <svg
      viewBox="0 0 160 160"
      className="h-40 w-40 md:h-48 md:w-48"
      aria-hidden="true"
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        stroke="rgba(15,23,42,0.9)"
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      {data.map((d) => {
        const value = isFinite(d.value) ? d.value : 0;
        const fraction = value / total;
        const dash = circumference * fraction;
        const dashArray = `${dash} ${circumference}`;
        const strokeDashoffset = offset;
        offset -= dash;
        return (
          <circle
            key={d.key}
            cx={center}
            cy={center}
            r={radius}
            stroke={FREQUENCY_COLORS[d.key]}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={dashArray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={center} cy={center} r={radius - strokeWidth} fill="#020617" />
      <text
        x={center}
        y={center - 4}
        textAnchor="middle"
        className="text-[9px] md:text-[10px]"
        fill="#e5e7eb"
      >
        BUYER
      </text>
      <text
        x={center}
        y={center + 10}
        textAnchor="middle"
        className="text-[9px] md:text-[10px]"
        fill="#e5e7eb"
      >
        FREQUENCY
      </text>
    </svg>
  );
}

function getFullName(taker: QscTakerRow | null | undefined): string | null {
  if (!taker) return null;
  const first = (taker.first_name || "").trim();
  const last = (taker.last_name || "").trim();
  const full = `${first} ${last}`.trim();
  if (full) return full;
  const email = (taker.email || "").trim();
  return email || null;
}

export default function QscResultPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const searchParams = useSearchParams();
  const tid = searchParams?.get("tid") ?? "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [payload, setPayload] = useState<QscPayload | null>(null);

  const [audienceResolved, setAudienceResolved] = useState<"entrepreneur" | "leader">(
    "entrepreneur"
  );
  const [audienceSource, setAudienceSource] = useState<string>("default");
  const [metaApiVersion, setMetaApiVersion] = useState<string | null>(null);

  const reportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const resultUrl = tid
          ? `/api/public/qsc/${encodeURIComponent(token)}/result?tid=${encodeURIComponent(tid)}`
          : `/api/public/qsc/${encodeURIComponent(token)}/result`;

        const res = await fetch(resultUrl, { cache: "no-store" });

        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(
            `Non-JSON response (${res.status}): ${text.slice(0, 200)}`
          );
        }

        const j = (await res.json()) as any;

        if (!res.ok || j.ok === false) {
          throw new Error(j.error || `HTTP ${res.status}`);
        }

        if (alive && j.results) {
          const nextPayload: QscPayload = {
            results: j.results,
            profile: j.profile ?? null,
            persona: j.persona ?? null,
            taker: j.taker ?? null,
          };

          setPayload(nextPayload);

          // First preference: results.audience if present
          if (j.results.audience === "leader" || j.results.audience === "entrepreneur") {
            setAudienceResolved(j.results.audience);
            setAudienceSource("qsc_results.audience");
          } else {
            // Fallback: derive from meta endpoint
            try {
              const metaUrl = tid
                ? `/api/public/qsc/${encodeURIComponent(token)}/meta?tid=${encodeURIComponent(tid)}`
                : `/api/public/qsc/${encodeURIComponent(token)}/meta`;

              const mres = await fetch(metaUrl, { cache: "no-store" });
              const mct = mres.headers.get("content-type") || "";
              if (mct.includes("application/json")) {
                const mj = await mres.json();
                if (mj?.ok && (mj.audience === "leader" || mj.audience === "entrepreneur")) {
                  setAudienceResolved(mj.audience);
                  setAudienceSource(mj.source || "meta");
                  setMetaApiVersion(mj.__api_version ?? null);
                } else {
                  setAudienceResolved("entrepreneur");
                  setAudienceSource("meta_failed_default");
                }
              } else {
                setAudienceResolved("entrepreneur");
                setAudienceSource("meta_non_json_default");
              }
            } catch {
              setAudienceResolved("entrepreneur");
              setAudienceSource("meta_error_default");
            }
          }
        }
      } catch (e: any) {
        if (alive) setErr(String(e?.message || e || "Unknown error"));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token, tid]);

  async function handleDownloadPdf() {
    if (!reportRef.current) return;

    const element = reportRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
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

    pdf.save(`qsc-snapshot-${token}.pdf`);
  }

  const result = payload?.results ?? null;
  const profile = payload?.profile ?? null;
  const persona = payload?.persona ?? null;
  const taker = payload?.taker ?? null;

  const personalityPerc = useMemo<PersonalityPercMap>(
    () => result?.personality_percentages || {},
    [result]
  );
  const mindsetPerc = useMemo<MindsetPercMap>(
    () => result?.mindset_percentages || {},
    [result]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <main className="mx-auto max-w-5xl px-4 py-12">
          <p className="text-sm font-semibold tracking-[0.25em] uppercase text-sky-300/80">
            Quantum Source Code
          </p>
          <h1 className="mt-3 text-3xl font-bold">Loading your results…</h1>
        </main>
      </div>
    );
  }

  if (err || !result) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <main className="mx-auto max-w-5xl px-4 py-12 space-y-4">
          <p className="text-sm font-semibold tracking-[0.25em] uppercase text-sky-300/80">
            Quantum Source Code
          </p>
          <h1 className="text-3xl font-bold">Something went wrong</h1>
          <p className="text-sm text-slate-300">
            We couldn&apos;t load your Quantum Source Code result.
          </p>
          <pre className="mt-2 rounded-xl border border-slate-800 bg-slate-950/90 p-3 text-xs text-slate-100 whitespace-pre-wrap">
            {err || "No data"}
          </pre>
          <p className="text-xs text-slate-500">
            Debug endpoint:{" "}
            <code className="break-all">
              /api/public/qsc/{token}/result{tid ? `?tid=${tid}` : ""}
            </code>
          </p>
        </main>
      </div>
    );
  }

  const primaryPersonaLabel =
    persona?.profile_label || profile?.profile_label || "Combined profile";
  const createdAt = new Date(result.created_at);
  const takerDisplayName = getFullName(taker);

  const frequencyDonutData: FrequencyDonutDatum[] = PERSONALITIES.map((p) => ({
    key: p.key,
    label: p.label,
    value: personalityPerc[p.key] ?? 0,
  }));

  const baseExtendedPath =
    audienceResolved === "leader"
      ? `/qsc/${encodeURIComponent(token)}/leader`
      : `/qsc/${encodeURIComponent(token)}/entrepreneur`;

  const extendedReportHref = tid
    ? `${baseExtendedPath}?tid=${encodeURIComponent(tid)}`
    : baseExtendedPath;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <main
        ref={reportRef}
        className="mx-auto max-w-6xl px-4 py-10 md:py-12 space-y-10"
      >
        <section className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
                Quantum Source Code
              </p>
              <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
                Your Buyer Persona Snapshot
              </h1>

              {takerDisplayName && (
                <p className="mt-1 text-sm text-slate-300">
                  For:{" "}
                  <span className="font-semibold text-slate-50">
                    {takerDisplayName}
                  </span>
                </p>
              )}

              <p className="mt-2 text-sm text-slate-300 max-w-2xl">
                This view combines your{" "}
                <span className="font-semibold">Buyer Frequency Type</span>{" "}
                and <span className="font-semibold">Buyer Mindset Level</span>{" "}
                into one Quantum Source Code profile.
              </p>

              {/* Debug (remove later) */}
              <div className="mt-3 text-xs text-slate-500 space-y-1">
                <div>audienceResolved: {audienceResolved}</div>
                <div>audienceSource: {audienceSource}</div>
                {metaApiVersion && <div>meta API: {metaApiVersion}</div>}
                <div>created_at (raw UTC): {result.created_at}</div>
              </div>
            </div>

            <div className="flex flex-col gap-2 md:items-end">
              <button
                onClick={handleDownloadPdf}
                className="inline-flex items-center rounded-xl border border-slate-600 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-50 shadow-sm hover:bg-slate-800"
              >
                Download PDF
              </button>
              <Link
                href={extendedReportHref}
                className="inline-flex items-center rounded-xl border border-sky-500/70 bg-sky-600/80 px-4 py-2 text-sm font-medium text-slate-50 shadow-md shadow-sky-900/60 hover:bg-sky-500 hover:border-sky-400 transition"
              >
                {audienceResolved === "leader"
                  ? "View Strategic Leadership Report →"
                  : "View Strategic Growth Report →"}
              </Link>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 md:p-7 shadow-xl shadow-black/50">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/90">
                Combined profile
              </p>
              <h2 className="mt-3 text-2xl font-semibold">
                {primaryPersonaLabel}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Code:{" "}
                <span className="font-mono text-slate-100">
                  {result.combined_profile_code || "—"}
                </span>
              </p>

              <dl className="mt-5 grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">
                    Primary personality
                  </dt>
                  <dd className="mt-0.5 font-medium">
                    {result.primary_personality || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">
                    Secondary personality
                  </dt>
                  <dd className="mt-0.5 font-medium">
                    {result.secondary_personality || "—"}
                  </dd>
                </div>
                <div className="mt-2">
                  <dt className="text-xs uppercase tracking-wide text-slate-400">
                    Primary mindset
                  </dt>
                  <dd className="mt-0.5 font-medium">
                    {result.primary_mindset || "—"}
                  </dd>
                </div>
                <div className="mt-2">
                  <dt className="text-xs uppercase tracking-wide text-slate-400">
                    Secondary mindset
                  </dt>
                  <dd className="mt-0.5 font-medium">
                    {result.secondary_mindset || "—"}
                  </dd>
                </div>
              </dl>

              <p className="mt-5 text-xs text-slate-500">
                Created at{" "}
                {createdAt.toLocaleString(undefined, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 md:p-7 shadow-lg shadow-black/40 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/90">
                Snapshot for your sales playbook
              </p>

              <div className="space-y-3 text-sm">
                <div>
                  <h3 className="font-semibold text-slate-100">
                    How to communicate
                  </h3>
                  <p className="mt-1 text-slate-300 whitespace-pre-line">
                    {profile?.how_to_communicate || "[todo: how to communicate]"}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-100">Decision style</h3>
                  <p className="mt-1 text-slate-300 whitespace-pre-line">
                    {profile?.decision_style || "[todo: decision style]"}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <h3 className="font-semibold text-slate-100">Core challenges</h3>
                    <p className="mt-1 text-slate-300 whitespace-pre-line">
                      {profile?.business_challenges ||
                        "[todo: core business challenges]"}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100">Trust signals</h3>
                    <p className="mt-1 text-slate-300 whitespace-pre-line">
                      {profile?.trust_signals || "[todo: trust signals]"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <h3 className="font-semibold text-slate-100">Offer fit</h3>
                    <p className="mt-1 text-slate-300 whitespace-pre-line">
                      {profile?.offer_fit || "[todo: best offer fit]"}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100">Sale blockers</h3>
                    <p className="mt-1 text-slate-300 whitespace-pre-line">
                      {profile?.sale_blockers || "[todo: what blocks the sale]"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 md:p-7 shadow-lg shadow-black/40">
            <h2 className="text-lg font-semibold">Buyer Frequency Type</h2>
            <p className="mt-1 text-sm text-slate-300">
              Your emotional & energetic style across Fire, Flow, Form and Field.
            </p>

            <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center">
              <div className="flex justify-center">
                <FrequencyDonut data={frequencyDonutData} />
              </div>

              <div className="space-y-3 text-sm">
                {frequencyDonutData.map((d) => (
                  <div
                    key={d.key}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: FREQUENCY_COLORS[d.key] }}
                      />
                      <span className="font-medium text-slate-100">{d.label}</span>
                    </div>
                    <span className="text-sm text-slate-300">
                      {percentLabel(d.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 md:p-7 shadow-lg shadow-black/40">
            <h2 className="text-lg font-semibold">Buyer Mindset Levels</h2>
            <p className="mt-1 text-sm text-slate-300">
              Where they are in their current business journey.
            </p>

            <div className="mt-5 space-y-3">
              {MINDSETS.map((m) => {
                const pct = mindsetPerc[m.key] ?? 0;
                return (
                  <div key={m.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-100">{m.label}</span>
                      <span className="text-slate-400">{percentLabel(pct)}</span>
                    </div>
                    <Bar pct={pct} />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold">
                Buyer Persona Matrix
              </h2>
              <p className="mt-1 text-sm text-slate-300 max-w-2xl">
                This grid maps your{" "}
                <span className="font-semibold">Buyer Frequency Type</span>{" "}
                (left to right) against your{" "}
                <span className="font-semibold">Buyer Mindset Level</span> (top
                to bottom). Your combined profile sits at the intersection.
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <div className="inline-grid grid-cols-[auto_repeat(4,minmax(140px,1fr))] gap-3 md:gap-4 items-stretch">
              <div />

              {PERSONALITIES.map((p) => (
                <div
                  key={p.key}
                  className="px-3 pb-1 pt-0.5 text-center text-xs font-semibold tracking-wide text-slate-300"
                >
                  <div>{p.label}</div>
                  <div className="text-[11px] text-slate-500">
                    Frequency {p.code}
                  </div>
                </div>
              ))}

              {MINDSETS.map((m) => (
                <div key={m.key} className="contents">
                  <div className="flex flex-col justify-center text-xs font-medium text-slate-300 pr-2">
                    <span>{m.label}</span>
                    <span className="text-[11px] text-slate-500">
                      Mindset {m.level}
                    </span>
                  </div>

                  {PERSONALITIES.map((p) => {
                    const cell = MATRIX.find(
                      (c) => c.personality === p.key && c.mindset === m.key
                    )!;
                    const cat = classifyCell(result, cell);

                    return (
                      <div
                        key={`${m.key}_${p.key}`}
                        className={[
                          "min-h-[96px] rounded-2xl border px-3 py-3 md:px-4 md:py-4 flex flex-col justify-between text-xs transition-colors",
                          categoryClasses(cat),
                        ].join(" ")}
                      >
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.15em] mb-1">
                            {p.label} {m.label}
                          </div>
                          <div className="text-[11px] text-slate-300/90">
                            Code: <span className="font-mono">{cell.code}</span>
                          </div>
                        </div>

                        {cat === "primary" && (
                          <div className="mt-2 text-[11px] font-medium text-slate-50">
                            Primary combined profile
                          </div>
                        )}
                        {cat === "secondary" && (
                          <div className="mt-2 text-[11px] font-medium text-slate-50/90">
                            Secondary / supporting profile
                          </div>
                        )}
                        {cat === "related" && (
                          <div className="mt-2 text-[11px] text-slate-200/85">
                            Related frequency or mindset
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-slate-300">
            <div className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-sky-500" />
              <span>Primary combined profile</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-sky-500/30 border border-sky-400/80" />
              <span>Secondary profile / supporting mode</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-sky-500/10 border border-sky-400/40" />
              <span>Related frequencies or mindsets</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-slate-900 border border-slate-700/60" />
              <span>Other personas</span>
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
