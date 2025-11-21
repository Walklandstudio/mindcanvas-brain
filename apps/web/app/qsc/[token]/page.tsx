"use client";

import React, { useEffect, useState } from "react";
import { QscMatrix, PersonalityKey, MindsetKey } from "../QscMatrix";

type QscResult = {
  id: string;
  test_id: string;
  token: string;
  personality_totals: Partial<Record<PersonalityKey, number>>;
  personality_percentages: Partial<Record<PersonalityKey, number>>;
  mindset_totals: Partial<Record<MindsetKey, number>>;
  mindset_percentages: Partial<Record<MindsetKey, number>>;
  primary_personality: PersonalityKey;
  secondary_personality: PersonalityKey | null;
  primary_mindset: MindsetKey;
  secondary_mindset: MindsetKey | null;
  combined_profile_code: string;
  qsc_profile_id: string;
  created_at: string;
};

type QscProfile = {
  id: string;
  personality_code: string; // A–D
  mindset_level: number; // 1–5
  profile_code: string; // e.g. D4
  profile_label: string; // e.g. "Field Orbit"
  how_to_communicate: string;
  decision_style: string;
  business_challenges: string;
  trust_signals: string;
  offer_fit: string;
  sale_blockers: string;
  created_at: string;
};

type ApiResponse = {
  ok: boolean;
  results: QscResult;
  profile: QscProfile;
};

function pctLabel(value: number | undefined | null): string {
  if (!value || !Number.isFinite(value)) return "0.0%";
  return `${value.toFixed(1)}%`;
}

export default function QscResultPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QscResult | null>(null);
  const [profile, setProfile] = useState<QscProfile | null>(null);

  // Load QSC result from the public API
  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/public/qsc/${encodeURIComponent(token)}/result`,
          { cache: "no-store" }
        );

        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(
            `Non-JSON response (${res.status}): ${text.slice(0, 200)}`
          );
        }

        const json = (await res.json()) as ApiResponse | any;

        if (!res.ok || json?.ok === false) {
          throw new Error(json?.error || `HTTP ${res.status}`);
        }

        if (!json?.results) {
          throw new Error("No data");
        }

        if (!alive) return;
        setResult(json.results as QscResult);
        setProfile(json.profile as QscProfile);
      } catch (err: any) {
        if (!alive) return;
        setError(String(err?.message || err || "Unknown error"));
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [token]);

  // ---------------------------------------------------------------------------
  // States: loading / error
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <main className="mx-auto max-w-5xl px-4 py-10">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
            Quantum Source Code
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            Loading your Buyer Persona Snapshot…
          </h1>
        </main>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <main className="mx-auto max-w-5xl px-4 py-10 space-y-4">
          <h1 className="text-2xl md:text-3xl font-semibold">
            Something went wrong
          </h1>
          <p className="text-sm text-slate-300">
            We couldn&apos;t load your Quantum Source Code result.
          </p>
          <pre className="mt-2 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-xs text-slate-100 whitespace-pre-wrap">
            {error || "No data"}
          </pre>
          <p className="text-xs text-slate-500">
            Debug endpoint:{" "}
            <code className="font-mono">
              /api/public/qsc/{token}/result
            </code>
          </p>
        </main>
      </div>
    );
  }

  // Convenience locals
  const personalityPct = result.personality_percentages || {};
  const mindsetPct = result.mindset_percentages || {};

  const primaryPersonality = result.primary_personality;
  const secondaryPersonality = result.secondary_personality ?? null;
  const primaryMindset = result.primary_mindset;
  const secondaryMindset = result.secondary_mindset ?? null;

  const createdLabel = (() => {
    try {
      return new Date(result.created_at).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return result.created_at;
    }
  })();

  const profileTitle = profile?.profile_label || "Buyer Persona";
  const profileSubtitle = result.combined_profile_code || "";

  // ---------------------------------------------------------------------------
  // Main UI
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:py-10">
        {/* Top header */}
        <header className="space-y-2 border-b border-slate-800 pb-5">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
            Quantum Source Code
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Your Buyer Persona Snapshot
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            This view combines your{" "}
            <span className="font-semibold">Buyer Frequency Type</span> and{" "}
            <span className="font-semibold">Buyer Mindset Level</span> into one
            Quantum Source Code profile.
          </p>
        </header>

        {/* Snapshot + playbook */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)]">
          {/* Combined profile card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 shadow-lg shadow-black/50">
            <p className="text-[0.7rem] font-semibold tracking-[0.22em] uppercase text-sky-300/80">
              Combined profile
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{profileTitle}</h2>
            <p className="mt-1 text-xs text-slate-400 uppercase tracking-[0.2em]">
              Code:{" "}
              <span className="font-mono tracking-wide">
                {profileSubtitle || "—"}
              </span>
            </p>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400 text-xs uppercase tracking-[0.18em]">
                  Primary personality
                </dt>
                <dd className="font-medium">
                  {primaryPersonality || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400 text-xs uppercase tracking-[0.18em]">
                  Secondary personality
                </dt>
                <dd className="font-medium">
                  {secondaryPersonality || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400 text-xs uppercase tracking-[0.18em]">
                  Primary mindset
                </dt>
                <dd className="font-medium">{primaryMindset || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400 text-xs uppercase tracking-[0.18em]">
                  Secondary mindset
                </dt>
                <dd className="font-medium">
                  {secondaryMindset || "—"}
                </dd>
              </div>
            </dl>

            <p className="mt-5 text-[0.7rem] text-slate-500">
              Created at {createdLabel}
            </p>
          </div>

          {/* Sales playbook snapshot */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 shadow-lg shadow-black/50">
            <p className="text-[0.7rem] font-semibold tracking-[0.22em] uppercase text-sky-300/80">
              Snapshot for your sales playbook
            </p>

            <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
              <div>
                <dt className="font-semibold text-slate-100">
                  How to communicate
                </dt>
                <dd className="mt-1 text-slate-300 whitespace-pre-line">
                  {profile?.how_to_communicate || "[todo: how to communicate]"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-100">
                  Decision style
                </dt>
                <dd className="mt-1 text-slate-300 whitespace-pre-line">
                  {profile?.decision_style || "[todo: decision style]"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-100">
                  Core challenges
                </dt>
                <dd className="mt-1 text-slate-300 whitespace-pre-line">
                  {profile?.business_challenges ||
                    "[todo: core business challenges]"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-100">
                  Trust signals
                </dt>
                <dd className="mt-1 text-slate-300 whitespace-pre-line">
                  {profile?.trust_signals || "[todo: trust signals]"}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* NEW: QSC matrix heatmap */}
        <QscMatrix
          primaryPersonality={primaryPersonality}
          secondaryPersonality={secondaryPersonality}
          primaryMindset={primaryMindset}
          secondaryMindset={secondaryMindset}
          personalityPercentages={personalityPct}
          mindsetPercentages={mindsetPct}
        />

        {/* Frequency + Mindset bars */}
        <section className="grid gap-6 md:grid-cols-2">
          {/* Frequency types */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 shadow-lg shadow-black/50">
            <h3 className="text-lg font-semibold">Buyer Frequency Types</h3>
            <p className="mt-1 text-xs text-slate-300">
              How this buyer prefers to think, decide, and buy.
            </p>

            <div className="mt-4 space-y-3 text-sm">
              {(["FIRE", "FLOW", "FORM", "FIELD"] as PersonalityKey[]).map(
                (key) => {
                  const label = key.charAt(0) + key.slice(1).toLowerCase();
                  const value = personalityPct[key] ?? 0;
                  const width = Math.max(0, Math.min(100, value));

                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{label}</span>
                        <span className="text-xs text-slate-400">
                          {pctLabel(value)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-sky-500"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* Mindset levels */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 shadow-lg shadow-black/50">
            <h3 className="text-lg font-semibold">Buyer Mindset Levels</h3>
            <p className="mt-1 text-xs text-slate-300">
              Where they are in their current business journey.
            </p>

            <div className="mt-4 space-y-3 text-sm">
              {(
                ["ORIGIN", "MOMENTUM", "VECTOR", "ORBIT", "QUANTUM"] as MindsetKey[]
              ).map((key, index) => {
                const label =
                  key.charAt(0) + key.slice(1).toLowerCase();
                const value = mindsetPct[key] ?? 0;
                const width = Math.max(0, Math.min(100, value));

                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {label}{" "}
                        <span className="text-xs text-slate-500">
                          (Level {index + 1})
                        </span>
                      </span>
                      <span className="text-xs text-slate-400">
                        {pctLabel(value)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-sky-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
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
