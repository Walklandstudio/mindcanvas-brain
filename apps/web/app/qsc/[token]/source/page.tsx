"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type PersonalityKey = "FIRE" | "FLOW" | "FORM" | "FIELD";
type MindsetKey = "ORIGIN" | "MOMENTUM" | "VECTOR" | "ORBIT" | "QUANTUM";

type PersonalityPercMap = Partial<Record<PersonalityKey, number>>;
type MindsetPercMap = Partial<Record<MindsetKey, number>>;

type QscResultsRow = {
  id: string;
  test_id: string;
  token: string;
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
  mindset_level: number | null;
  profile_code: string | null;
  profile_label: string | null;
  show_up_summary: string | null;
  energisers: string | null;
  drains: string | null;
  communication_long: string | null;
  admired_for: string | null;
  stuck_points: string | null;
};

type QscPayload = {
  results: QscResultsRow;
  profile: QscProfileRow | null;
  persona?: QscPersonaRow | null;
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

export default function QscExtendedSourceCodePage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;
  const searchParams = useSearchParams();
  const tid = searchParams?.get("tid") ?? "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [payload, setPayload] = useState<QscPayload | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch(
          `/api/public/qsc/${encodeURIComponent(token)}/result`,
          { cache: "no-store" }
        );

        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(
            `Non-JSON response (${res.status}): ${text.slice(0, 200)}`
          );
        }

        const j = (await res.json()) as {
          ok?: boolean;
          error?: string;
          results?: QscResultsRow;
          profile?: QscProfileRow | null;
          persona?: QscPersonaRow | null;
        };

        if (!res.ok || j.ok === false) {
          throw new Error(j.error || `HTTP ${res.status}`);
        }

        if (alive && j.results) {
          setPayload({
            results: j.results,
            profile: j.profile ?? null,
            persona: j.persona ?? null,
          });
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
  }, [token]);

  const result = payload?.results ?? null;
  const profile = payload?.profile ?? null;
  const persona = payload?.persona ?? null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <main className="mx-auto max-w-5xl px-4 py-12 space-y-4">
          <p className="text-sm font-semibold tracking-[0.25em] uppercase text-sky-300/80">
            Quantum Source Code
          </p>
          <h1 className="mt-3 text-3xl font-bold">
            Preparing your Extended Source Code…
          </h1>
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
          <h1 className="text-3xl font-bold">Couldn&apos;t load report</h1>
          <p className="text-sm text-slate-300">
            We weren&apos;t able to generate your Extended Source Code report.
          </p>
          <pre className="mt-2 rounded-xl border border-slate-800 bg-slate-950/90 p-3 text-xs text-slate-100 whitespace-pre-wrap">
            {err || "No data"}
          </pre>
          <p className="text-xs text-slate-500">
            Debug endpoint:{" "}
            <code className="break-all">
              /api/public/qsc/{token}/result
            </code>
          </p>
        </main>
      </div>
    );
  }

  const createdAt = new Date(result.created_at);
  const personaName =
    persona?.profile_label ||
    profile?.profile_label ||
    "Your combined profile";

  const primaryPersonalityLabel =
    (result.primary_personality &&
      PERSONALITY_LABELS[result.primary_personality]) ||
    result.primary_personality ||
    "—";

  const primaryMindsetLabel =
    (result.primary_mindset && MINDSET_LABELS[result.primary_mindset]) ||
    result.primary_mindset ||
    "—";

  const backToSnapshotHref =
    tid && typeof window !== "undefined"
      ? `/qsc/${encodeURIComponent(token)}?tid=${encodeURIComponent(tid)}`
      : `/qsc/${encodeURIComponent(token)}`;

  const showUp = persona?.show_up_summary || "—";
  const energises = persona?.energisers || "—";
  const drains = persona?.drains || "—";
  const commLong =
    persona?.communication_long || profile?.how_to_communicate || "—";
  const admired = persona?.admired_for || "—";
  const stuck = persona?.stuck_points || "—";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <main className="mx-auto max-w-5xl px-4 py-10 md:py-12 space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
              Quantum Source Code
            </p>
            <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
              Extended Source Code Report
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-xl">
              Strategic growth view for the QSC Entrepreneur profile based on
              your Buyer Frequency Type and Buyer Mindset Level.
            </p>
          </div>

          <div className="flex gap-3 md:items-end">
            <Link
              href={backToSnapshotHref}
              className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition"
            >
              ← Back to Snapshot
            </Link>
            <button
              className="inline-flex items-center rounded-xl border border-slate-700/70 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-300 cursor-not-allowed"
              disabled
              title="PDF export coming soon"
            >
              Generate PDF (coming soon)
            </button>
          </div>
        </header>

        {/* Combined profile summary */}
        <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 md:p-7 shadow-xl shadow-black/50 space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/90">
                Combined profile
              </p>
              <h2 className="mt-2 text-2xl font-semibold">{personaName}</h2>
              <p className="mt-1 text-xs text-slate-400">
                Code:{" "}
                <span className="font-mono text-slate-100">
                  {result.combined_profile_code || "—"}
                </span>
              </p>
            </div>
            <div className="text-xs text-slate-400">
              Created at{" "}
              {createdAt.toLocaleString(undefined, {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>

          <dl className="grid gap-y-3 gap-x-6 text-sm md:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Primary personality
              </dt>
              <dd className="mt-0.5 font-medium">
                {primaryPersonalityLabel}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Primary mindset
              </dt>
              <dd className="mt-0.5 font-medium">
                {primaryMindsetLabel}
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
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Secondary mindset
              </dt>
              <dd className="mt-0.5 font-medium">
                {result.secondary_mindset || "—"}
              </dd>
            </div>
          </dl>
        </section>

        {/* Sales playbook & growth view */}
        <section className="grid gap-6 md:grid-cols-2">
          {/* Sales playbook snapshot */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/85 p-6 md:p-7 shadow-lg shadow-black/40 space-y-3">
            <h2 className="text-lg font-semibold">
              Snapshot for your sales playbook
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <h3 className="font-semibold text-slate-100">
                  How to communicate
                </h3>
                <p className="mt-1 text-slate-300 whitespace-pre-line">
                  {profile?.how_to_communicate || "—"}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-100">Decision style</h3>
                <p className="mt-1 text-slate-300 whitespace-pre-line">
                  {profile?.decision_style || "—"}
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold text-slate-100">
                    Core challenges
                  </h3>
                  <p className="mt-1 text-slate-300 whitespace-pre-line">
                    {profile?.business_challenges || "—"}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100">
                    Trust signals
                  </h3>
                  <p className="mt-1 text-slate-300 whitespace-pre-line">
                    {profile?.trust_signals || "—"}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold text-slate-100">Offer fit</h3>
                  <p className="mt-1 text-slate-300 whitespace-pre-line">
                    {profile?.offer_fit || "—"}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100">
                    Sale blockers
                  </h3>
                  <p className="mt-1 text-slate-300 whitespace-pre-line">
                    {profile?.sale_blockers || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Strategic growth focus – persona enriched */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/85 p-6 md:p-7 shadow-lg shadow-black/40 space-y-4">
            <h2 className="text-lg font-semibold">Strategic growth focus</h2>

            <div className="space-y-3 text-sm">
              <div>
                <h3 className="font-semibold text-slate-100">
                  How you show up
                </h3>
                <p className="mt-1 text-slate-300 whitespace-pre-line">
                  {showUp}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold text-slate-100">
                    What energises you
                  </h3>
                  <p className="mt-1 text-slate-300 whitespace-pre-line">
                    {energises}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100">
                    What drains you
                  </h3>
                  <p className="mt-1 text-slate-300 whitespace-pre-line">
                    {drains}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-100">
                  How to communicate with you
                </h3>
                <p className="mt-1 text-slate-300 whitespace-pre-line">
                  {commLong}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold text-slate-100">
                    What you&apos;re admired for
                  </h3>
                  <p className="mt-1 text-slate-300 whitespace-pre-line">
                    {admired}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100">
                    Where you get stuck
                  </h3>
                  <p className="mt-1 text-slate-300 whitespace-pre-line">
                    {stuck}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-6 text-xs text-slate-500">
          © {new Date().getFullYear()} MindCanvas — Profiletest.ai
        </footer>
      </main>
    </div>
  );
}
