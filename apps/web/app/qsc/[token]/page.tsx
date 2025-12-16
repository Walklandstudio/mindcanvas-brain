// apps/web/app/qsc/[token]/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { QscMatrix } from "../QscMatrix";

type Audience = "entrepreneur" | "leader";

type PersonalityKey = "FIRE" | "FLOW" | "FORM" | "FIELD";
type MindsetKey = "ORIGIN" | "MOMENTUM" | "VECTOR" | "ORBIT" | "QUANTUM";

type PersonalityPercMap = Partial<Record<PersonalityKey, number>>;
type MindsetPercMap = Partial<Record<MindsetKey, number>>;

type QscResultsRow = {
  id: string;
  test_id: string;
  token: string;
  audience: Audience | null;

  personality_totals: Record<string, number> | null;
  personality_percentages: PersonalityPercMap | null;
  mindset_totals: Record<string, number> | null;
  mindset_percentages: MindsetPercMap | null;

  primary_personality: PersonalityKey | null;
  secondary_personality: PersonalityKey | null;
  primary_mindset: MindsetKey | null;
  secondary_mindset: MindsetKey | null;

  combined_profile_code: string | null;
  qsc_profile_id: string | null;

  created_at: string;
};

type QscProfileRow = {
  id: string;
  personality_code: string | null;
  mindset_level: number | null;
  profile_code: string | null;
  profile_label: string | null;

  how_to_communicate?: string | null;
  decision_style?: string | null;
  business_challenges?: string | null;
  trust_signals?: string | null;
  offer_fit?: string | null;
  sale_blockers?: string | null;

  full_internal_insights?: any;
  created_at?: string | null;
};

type QscLeaderPersonaRow = {
  id: string;
  test_id: string;
  profile_code: string | null;
  profile_label: string | null;
  personality_code: string | null;
  mindset_level: number | null;
  sections?: any | null; // used on leader report, not needed here
};

type QscEntrepreneurPersonaRow = {
  id: string;
  test_id: string;
  personality_code: string | null;
  mindset_level: number | null;
  profile_code: string | null;
  profile_label: string | null;

  // Entrepreneur persona has many fields; snapshot uses a small subset if present.
  how_to_communicate?: string | null;
  decision_style?: string | null;
  business_challenges?: string | null;
  trust_signals?: string | null;
  offer_fit?: string | null;
  sale_blockers?: string | null;
};

type TestTakerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company: string | null;
  role_title: string | null;
};

type ApiPayload = {
  ok: boolean;
  results: QscResultsRow;
  profile?: QscProfileRow | null;
  persona?: QscLeaderPersonaRow | QscEntrepreneurPersonaRow | null;
  taker?: TestTakerRow | null;
  __debug?: any;
};

const PERSONALITY_LABELS: Record<PersonalityKey, string> = {
  FIRE: "Fire",
  FLOW: "Flow",
  FORM: "Form",
  FIELD: "Field",
};

const MINDSET_LABELS: Record<MindsetKey, string> = {
  ORIGIN: "Origin",
  MOMENTUM: "Momentum",
  VECTOR: "Vector",
  ORBIT: "Orbit",
  QUANTUM: "Quantum",
};

function normalisePercent(raw?: number | null): number {
  if (raw == null || !Number.isFinite(raw)) return 0;
  if (raw > 0 && raw <= 1.5) return Math.min(100, Math.max(0, raw * 100));
  return Math.min(100, Math.max(0, raw));
}

function titleCase(s: string) {
  return s
    .split(/[\s_-]+/g)
    .filter(Boolean)
    .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function safeText(v?: string | null) {
  const t = (v || "").trim();
  return t.length ? t : null;
}

function fallbackCombinedLabel(results: QscResultsRow) {
  const p = results.primary_personality
    ? PERSONALITY_LABELS[results.primary_personality]
    : null;
  const m = results.primary_mindset ? MINDSET_LABELS[results.primary_mindset] : null;
  if (p && m) return `${p} ${m}`;
  return "Your Combined Profile";
}

function getFullName(taker?: TestTakerRow | null) {
  const first = (taker?.first_name || "").trim();
  const last = (taker?.last_name || "").trim();
  const full = `${first} ${last}`.trim();
  if (full) return full;
  const email = (taker?.email || "").trim();
  return email || null;
}

export default function QscSnapshotPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const searchParams = useSearchParams();
  const tid = searchParams?.get("tid") ?? "";

  const [payload, setPayload] = useState<ApiPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const snapshotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const url = tid
          ? `/api/public/qsc/${encodeURIComponent(token)}/result?tid=${encodeURIComponent(
              tid
            )}`
          : `/api/public/qsc/${encodeURIComponent(token)}/result`;

        const res = await fetch(url, { cache: "no-store" });
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
        }

        const json = (await res.json()) as ApiPayload;

        if (!res.ok || !json.ok) {
          throw new Error((json as any)?.error || "Failed to load QSC snapshot");
        }

        if (alive) setPayload(json);
      } catch (e: any) {
        if (alive) setError(String(e?.message || e || "Unknown error"));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token, tid]);

  // ✅ HOOKS MUST BE CALLED UNCONDITIONALLY (always)
  const data = payload?.results ?? null;

  const personalityPerc = useMemo(() => {
    const p = data?.personality_percentages ?? {};
    return {
      FIRE: normalisePercent(p.FIRE),
      FLOW: normalisePercent(p.FLOW),
      FORM: normalisePercent(p.FORM),
      FIELD: normalisePercent(p.FIELD),
    };
  }, [data?.personality_percentages]);

  const mindsetPerc = useMemo(() => {
    const m = data?.mindset_percentages ?? {};
    return {
      ORIGIN: normalisePercent(m.ORIGIN),
      MOMENTUM: normalisePercent(m.MOMENTUM),
      VECTOR: normalisePercent(m.VECTOR),
      ORBIT: normalisePercent(m.ORBIT),
      QUANTUM: normalisePercent(m.QUANTUM),
    };
  }, [data?.mindset_percentages]);

  async function downloadPdf() {
    if (!snapshotRef.current) return;
    const canvas = await html2canvas(snapshotRef.current, { scale: 2, useCORS: true });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    pdf.addImage(img, "PNG", 0, 0, 210, 297);
    pdf.save(`qsc-snapshot-${token}.pdf`);
  }

  if (loading) return <div className="p-10">Loading snapshot…</div>;
  if (error || !data) {
    return <div className="p-10 text-red-600">{error || "No data"}</div>;
  }

  const takerName = getFullName(payload?.taker);

  const strategicHref =
    data.audience === "leader"
      ? `/qsc/${token}/leader${tid ? `?tid=${encodeURIComponent(tid)}` : ""}`
      : `/qsc/${token}/entrepreneur${tid ? `?tid=${encodeURIComponent(tid)}` : ""}`;

  // Combined profile label + code
  const personaLabelRaw =
    (payload?.persona as any)?.profile_label || payload?.profile?.profile_label || null;

  const combinedLabel =
    (personaLabelRaw && titleCase(String(personaLabelRaw))) || fallbackCombinedLabel(data);

  const combinedCode =
    safeText(data.combined_profile_code) ||
    safeText((payload?.persona as any)?.profile_code) ||
    safeText(payload?.profile?.profile_code) ||
    null;

  // Sales playbook fields: prefer persona fields, fallback to profile fields.
  const howToCommunicate =
    safeText((payload?.persona as any)?.how_to_communicate) ||
    safeText(payload?.profile?.how_to_communicate);

  const decisionStyle =
    safeText((payload?.persona as any)?.decision_style) ||
    safeText(payload?.profile?.decision_style);

  const businessChallenges =
    safeText((payload?.persona as any)?.business_challenges) ||
    safeText(payload?.profile?.business_challenges);

  const trustSignals =
    safeText((payload?.persona as any)?.trust_signals) ||
    safeText(payload?.profile?.trust_signals);

  const offerFit =
    safeText((payload?.persona as any)?.offer_fit) || safeText(payload?.profile?.offer_fit);

  const saleBlockers =
    safeText((payload?.persona as any)?.sale_blockers) ||
    safeText(payload?.profile?.sale_blockers);

  const hasPlaybook =
    !!howToCommunicate ||
    !!decisionStyle ||
    !!businessChallenges ||
    !!trustSignals ||
    !!offerFit ||
    !!saleBlockers;

  return (
    <div className="min-h-screen bg-slate-100">
      <main ref={snapshotRef} className="mx-auto max-w-5xl px-6 py-10 space-y-10">
        <header className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold">Your Buyer Persona Snapshot</h1>
            <p className="text-sm text-slate-600">Quantum Source Code Overview</p>
            {takerName && (
              <p className="text-xs text-slate-500 mt-1">
                For: <span className="font-semibold">{takerName}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadPdf}
              className="rounded-lg border px-3 py-1.5 text-xs bg-white"
            >
              Download PDF
            </button>
          </div>
        </header>

        {/* Percentage tiles */}
        <section className="grid grid-cols-2 gap-6">
          {Object.entries(personalityPerc).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white p-4 border">
              <div className="text-sm font-semibold">{PERSONALITY_LABELS[k as PersonalityKey]}</div>
              <div className="text-2xl font-bold">{Math.round(v)}%</div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-5 gap-4">
          {Object.entries(mindsetPerc).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white p-3 border text-center">
              <div className="text-xs">{MINDSET_LABELS[k as MindsetKey]}</div>
              <div className="font-bold">{Math.round(v)}%</div>
            </div>
          ))}
        </section>

        {/* Combined profile + Sales playbook */}
        <section className="rounded-3xl bg-[#020617] text-slate-50 border border-slate-800 p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
                Quantum Source Code
              </p>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 md:p-6">
                <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
                  Combined profile
                </p>
                <h2 className="mt-2 text-2xl md:text-3xl font-semibold">{combinedLabel}</h2>
                {combinedCode && (
                  <p className="mt-1 text-xs text-slate-300">
                    Code: <span className="font-mono">{combinedCode}</span>
                  </p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-slate-300">
                  <div>
                    <div className="text-[0.65rem] uppercase tracking-[0.18em] text-slate-400">
                      Primary personality
                    </div>
                    <div className="text-slate-100 font-semibold">
                      {data.primary_personality ? PERSONALITY_LABELS[data.primary_personality] : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[0.65rem] uppercase tracking-[0.18em] text-slate-400">
                      Secondary personality
                    </div>
                    <div className="text-slate-100 font-semibold">
                      {data.secondary_personality
                        ? PERSONALITY_LABELS[data.secondary_personality]
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[0.65rem] uppercase tracking-[0.18em] text-slate-400">
                      Primary mindset
                    </div>
                    <div className="text-slate-100 font-semibold">
                      {data.primary_mindset ? MINDSET_LABELS[data.primary_mindset] : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[0.65rem] uppercase tracking-[0.18em] text-slate-400">
                      Secondary mindset
                    </div>
                    <div className="text-slate-100 font-semibold">
                      {data.secondary_mindset ? MINDSET_LABELS[data.secondary_mindset] : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 md:pl-6">
              <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
                Snapshot for your sales playbook
              </p>

              {!hasPlaybook ? (
                <div className="mt-3 rounded-2xl border border-rose-900/40 bg-rose-950/20 p-4 text-sm text-rose-200">
                  <div className="font-semibold">Missing playbook content</div>
                  <div className="mt-1 text-xs text-rose-200/80">
                    Populate fields like <code>how_to_communicate</code>,{" "}
                    <code>decision_style</code>, <code>trust_signals</code>,{" "}
                    <code>offer_fit</code>, <code>sale_blockers</code> on{" "}
                    <code>portal.qsc_profiles</code> (or persona rows) and this will render.
                  </div>
                </div>
              ) : (
                <div className="mt-3 grid gap-5">
                  {howToCommunicate && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-50">How to communicate</h3>
                      <p className="mt-1 text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                        {howToCommunicate}
                      </p>
                    </div>
                  )}

                  {decisionStyle && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-50">Decision style</h3>
                      <p className="mt-1 text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                        {decisionStyle}
                      </p>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    {businessChallenges && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-50">Core challenges</h3>
                        <p className="mt-1 text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                          {businessChallenges}
                        </p>
                      </div>
                    )}

                    {trustSignals && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-50">Trust signals</h3>
                        <p className="mt-1 text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                          {trustSignals}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {offerFit && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-50">Offer fit</h3>
                        <p className="mt-1 text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                          {offerFit}
                        </p>
                      </div>
                    )}

                    {saleBlockers && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-50">Sale blockers</h3>
                        <p className="mt-1 text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                          {saleBlockers}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Matrix */}
        <section className="rounded-xl bg-white border p-6">
          <h2 className="font-semibold mb-3">Persona Matrix</h2>
          <QscMatrix primaryPersonality={data.primary_personality} primaryMindset={data.primary_mindset} />
        </section>

        <footer className="flex justify-end">
          <Link
            href={strategicHref}
            className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm"
          >
            View Strategic Report →
          </Link>
        </footer>
      </main>
    </div>
  );
}

