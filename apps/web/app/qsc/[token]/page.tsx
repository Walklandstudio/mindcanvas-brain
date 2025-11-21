"use client";

import { useEffect, useState } from "react";

type QscResultRow = {
  id: string;
  test_id: string;
  token: string;

  personality_totals: Record<string, number>;
  personality_percentages: Record<string, number>;

  mindset_totals: Record<string, number>;
  mindset_percentages: Record<string, number>;

  primary_personality: string | null;
  secondary_personality: string | null;
  primary_mindset: string | null;
  secondary_mindset: string | null;

  combined_profile_code: string | null;
  qsc_profile_id: string | null;
  created_at: string;
};

type QscProfileMeta = {
  id: string;
  personality_code: string; // A/B/C/D (Fire / Flow / Form / Field)
  mindset_level: number; // 1–5
  profile_code: string; // e.g. "FIELD_ORBIT" / "D4"
  profile_label: string;

  how_to_communicate: string;
  decision_style: string;
  business_challenges: string;
  trust_signals: string;
  offer_fit: string;
  sale_blockers: string;
};

type ApiPayload = {
  ok: boolean;
  error?: string;
  results?: QscResultRow | null;
  result?: QscResultRow | null;
  data?: QscResultRow | null;
  profile?: QscProfileMeta | null;
};

function Bar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
  return (
    <div className="w-full h-2 rounded bg-slate-800/80">
      <div
        className="h-2 rounded bg-sky-500"
        style={{ width: `${clamped.toFixed(0)}%` }}
      />
    </div>
  );
}

export default function QscResultPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [result, setResult] = useState<QscResultRow | null>(null);
  const [profile, setProfile] = useState<QscProfileMeta | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const res = await fetch(
          `/api/public/qsc/${encodeURIComponent(token)}/result`,
          { cache: "no-store" }
        );

        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          const txt = await res.text();
          throw new Error(
            `Non-JSON response (${res.status}): ${txt.slice(0, 200)}`
          );
        }

        const j: ApiPayload = await res.json();

        if (!res.ok || j.ok === false) {
          throw new Error(j.error || `HTTP ${res.status}`);
        }

        const payload: QscResultRow | null =
          j.data ?? j.result ?? j.results ?? null;

        if (!payload) {
          throw new Error("No data");
        }

        if (alive) {
          setResult(payload);
          setProfile(j.profile ?? null);
        }
      } catch (e: any) {
        if (alive) setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  // ---------------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <main className="mx-auto max-w-4xl px-4 py-16">
          <h1 className="text-2xl font-semibold">
            Loading your Quantum Source Code result…
          </h1>
        </main>
      </div>
    );
  }

  if (err || !result) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <main className="mx-auto max-w-4xl px-4 py-16 space-y-6">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/80">
              Quantum Source Code
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              We couldn&apos;t load your Quantum Source Code result.
            </p>
          </header>

          <pre className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-xs text-slate-100 whitespace-pre-wrap">
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

  // ---------------------------------------------------------------------------
  // Normalised data
  // ---------------------------------------------------------------------------

  const personalityPct = result.personality_percentages || {};
  const mindsetPct = result.mindset_percentages || {};

  const primaryPersonality = result.primary_personality ?? "—";
  const secondaryPersonality = result.secondary_personality ?? "—";
  const primaryMindset = result.primary_mindset ?? "—";
  const secondaryMindset = result.secondary_mindset ?? "—";
  const combinedCode = result.combined_profile_code ?? "—";

  const profileTitle =
    profile?.profile_label || `${primaryPersonality} • ${primaryMindset}`;

  const profileSubtitle = combinedCode !== "—" ? combinedCode : "";

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-10">
        {/* Header */}
        <header className="border-b border-slate-800 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/80">
            Quantum Source Code
          </p>
          <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
            Your Buyer Persona Snapshot
          </h1>
          <p className="mt-2 text-sm text-slate-300 max-w-2xl">
            This view combines your <span className="font-semibold">Buyer
            Frequency Type</span> and{" "}
            <span className="font-semibold">Buyer Mindset Level</span> into one
            Quantum Source Code profile.
          </p>
        </header>

        {/* Key profile card */}
        <section className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start">
          <div className="rounded-2xl border border-sky-500/40 bg-sky-900/20 p-6 shadow-xl shadow-sky-900/40">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/80">
              Combined profile
            </p>
            <h2 className="mt-2 text-2xl font-bold">{profileTitle}</h2>
            {profileSubtitle && (
              <p className="mt-1 text-sm text-slate-300">
                Code: <span className="font-mono">{profileSubtitle}</span>
              </p>
            )}

            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-400 text-xs uppercase tracking-wide">
                  Primary personality
                </dt>
                <dd className="mt-1 font-semibold">{primaryPersonality}</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-xs uppercase tracking-wide">
                  Secondary personality
                </dt>
                <dd className="mt-1 font-semibold">{secondaryPersonality}</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-xs uppercase tracking-wide">
                  Primary mindset
                </dt>
                <dd className="mt-1 font-semibold">{primaryMindset}</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-xs uppercase tracking-wide">
                  Secondary mindset
                </dt>
                <dd className="mt-1 font-semibold">{secondaryMindset}</dd>
              </div>
            </dl>

            <p className="mt-5 text-xs text-slate-400">
              Created at{" "}
              {new Date(result.created_at).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>

          {/* Profile meta for coaches / sales team */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 space-y-4 text-sm shadow-lg shadow-black/40">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Snapshot for your sales playbook
            </p>

            {profile ? (
              <>
                <div>
                  <h3 className="font-semibold mb-1">How to communicate</h3>
                  <p className="text-slate-200 whitespace-pre-line">
                    {profile.how_to_communicate}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Decision style</h3>
                  <p className="text-slate-200 whitespace-pre-line">
                    {profile.decision_style}
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <h3 className="font-semibold mb-1">Core challenges</h3>
                    <p className="text-slate-200 whitespace-pre-line">
                      {profile.business_challenges}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Trust signals</h3>
                    <p className="text-slate-200 whitespace-pre-line">
                      {profile.trust_signals}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-slate-300">
                Detailed playbook content for this profile hasn&apos;t been
                added yet, but your core Quantum Source Code metrics are ready
                below.
              </p>
            )}
          </div>
        </section>

        {/* Distribution panels */}
        <section className="grid gap-6 md:grid-cols-2">
          {/* Personality distribution */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 shadow-lg shadow-black/40">
            <h2 className="text-lg font-semibold mb-4">
              Buyer Frequency Types
            </h2>
            <p className="text-xs text-slate-400 mb-3">
              How this buyer prefers to think, decide, and buy.
            </p>
            <div className="space-y-3">
              {Object.entries(personalityPct).map(([key, value]) => (
                <div key={key} className="grid grid-cols-12 items-center gap-3">
                  <div className="col-span-4 text-xs sm:text-sm text-slate-100">
                    <span className="font-medium">{key}</span>
                  </div>
                  <div className="col-span-8">
                    <Bar pct={value} />
                    <div className="mt-1 text-[11px] text-slate-400">
                      {value.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
              {Object.keys(personalityPct).length === 0 && (
                <p className="text-xs text-slate-400">
                  No personality data recorded for this result.
                </p>
              )}
            </div>
          </div>

          {/* Mindset distribution */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 shadow-lg shadow-black/40">
            <h2 className="text-lg font-semibold mb-4">Buyer Mindset Levels</h2>
            <p className="text-xs text-slate-400 mb-3">
              Where they are in their current business journey.
            </p>
            <div className="space-y-3">
              {Object.entries(mindsetPct).map(([key, value]) => (
                <div key={key} className="grid grid-cols-12 items-center gap-3">
                  <div className="col-span-4 text-xs sm:text-sm text-slate-100">
                    <span className="font-medium">{key}</span>
                  </div>
                  <div className="col-span-8">
                    <Bar pct={value} />
                    <div className="mt-1 text-[11px] text-slate-400">
                      {value.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
              {Object.keys(mindsetPct).length === 0 && (
                <p className="text-xs text-slate-400">
                  No mindset data recorded for this result.
                </p>
              )}
            </div>
          </div>
        </section>

        <footer className="pt-4 text-xs text-slate-500">
          © {new Date().getFullYear()} MindCanvas — Profiletest.ai
        </footer>
      </div>
    </div>
  );
}
