"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type AB = "A" | "B" | "C" | "D";

type FrequencyLabel = { code: AB; name: string };
type ProfileLabel = { code: string; name: string };

type ReportData = {
  org_slug: string;
  test_name: string;
  taker: { id: string };
  frequency_labels: FrequencyLabel[];
  frequency_totals: Record<AB, number>;
  frequency_percentages: Record<AB, number>;
  profile_labels: ProfileLabel[];
  profile_totals: Record<string, number>;
  profile_percentages: Record<string, number>;
  top_freq: AB;
  top_profile_code: string;
  top_profile_name: string;
  version: string;
};

type LinkMeta = {
  name?: string | null;
  org_name?: string | null;
  show_results?: boolean | null;
  email_report?: boolean | null;
  hidden_results_message?: string | null;
  redirect_url?: string | null;

  // New – so we can detect QSC tests safely
  kind?: string | null;
  qsc_variant?: string | null;
};

// Simple bar component used in the standard profile result layout
function Bar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(1, Number(pct) || 0));
  const width = `${(clamped * 100).toFixed(0)}%`;
  return (
    <div className="w-full h-2 rounded bg-black/30">
      <div className="h-2 rounded bg-sky-500" style={{ width }} />
    </div>
  );
}

// Map profile code -> short key for image filenames
const PROFILE_CODE_TO_KEY: Record<string, string> = {
  P1: "visionary",
  P2: "catalyst",
  P3: "motivator",
  P4: "connector",
  P5: "facilitator",
  P6: "coordinator",
  P7: "controller",
  P8: "optimiser",
};

function getProfileCardImage(orgSlug?: string, profileCode?: string) {
  if (!orgSlug || !profileCode) return null;

  // For now we only have cards for Team Puzzle (tp-*.png)
  if (orgSlug !== "team-puzzle") return null;

  const normalised = profileCode.toUpperCase().replace(/^PROFILE_/, "P");
  const key = PROFILE_CODE_TO_KEY[normalised];
  if (!key) return null;

  const src = `/profile-cards/tp-${key}.png`;
  const alt = key.charAt(0).toUpperCase() + key.slice(1);

  return { src, alt };
}

export default function ResultPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const sp = useSearchParams();
  const tid = sp?.get("tid") ?? "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [data, setData] = useState<ReportData | null>(null);
  const [meta, setMeta] = useState<LinkMeta | null>(null);

  // Track whether we've already attempted a QSC redirect to avoid double-work
  const [qscRedirecting, setQscRedirecting] = useState(false);

  // Load result data (standard profile test result)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!tid) throw new Error("Missing taker ID (?tid=)");
        setLoading(true);
        setErr("");

        const url = `/api/public/test/${encodeURIComponent(
          token
        )}/result?tid=${encodeURIComponent(tid)}`;
        const res = await fetch(url, { cache: "no-store" });
        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(
            `Non-JSON response (${res.status}): ${text.slice(0, 300)}`
          );
        }
        const j = await res.json();
        if (!res.ok || j?.ok === false)
          throw new Error(j?.error || `HTTP ${res.status}`);

        if (alive) setData(j.data as ReportData);
      } catch (e: any) {
        if (alive) setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, tid]);

  // Load link meta (to see if results should be hidden, and detect QSC)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/public/test/${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) return;
        const j = await res.json();
        const metaData = j?.data ?? j ?? null;
        if (alive && metaData) {
          setMeta({
            name: metaData.name ?? metaData.test_name ?? null,
            org_name: metaData.org_name ?? null,
            show_results: metaData.show_results ?? null,
            email_report: metaData.email_report ?? null,
            hidden_results_message: metaData.hidden_results_message ?? null,
            redirect_url: metaData.redirect_url ?? null,
            // Try to pick up QSC flags from either top-level or nested meta
            kind:
              metaData.kind ??
              metaData.test_kind ??
              metaData.meta?.kind ??
              null,
            qsc_variant:
              metaData.qsc_variant ??
              metaData.meta?.qsc_variant ??
              null,
          });
        }
      } catch {
        // meta is optional; ignore errors
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  // 🔀 QSC redirect: if this is a Quantum Source Code test, send to /qsc/[token]/report
  useEffect(() => {
    if (!meta || !tid || qscRedirecting) return;

    const rawName = (meta.name || "").toLowerCase();

    const isQscByKind = (meta.kind || "").toLowerCase() === "qsc";
    const isQscByVariant = !!(meta.qsc_variant || "").length;
    const isQscByName = rawName.includes("quantum source code");

    const isQsc = isQscByKind || isQscByVariant || isQscByName;

    if (!isQsc) return;

    // Browser-only redirect
    if (typeof window !== "undefined") {
      setQscRedirecting(true);
      const url = `/qsc/${encodeURIComponent(token)}/report`;
      window.location.replace(url);
    }
  }, [meta, tid, token, qscRedirecting]);

  const freq = useMemo(
    () => data?.frequency_percentages ?? { A: 0, B: 0, C: 0, D: 0 },
    [data]
  );
  const prof = useMemo(() => data?.profile_percentages ?? {}, [data]);

  const shouldHideResults =
    meta?.show_results === false &&
    (meta.hidden_results_message ?? "").trim().length > 0;

  const hiddenMessage = (meta?.hidden_results_message ?? "").trim();
  const orgName = meta?.org_name || data?.org_slug || "your organisation";
  const rawTestName = meta?.name || data?.test_name || "Profile Test";

  // If the test name is still generic, use a more branded heading
  const heading =
    rawTestName && rawTestName !== "Profile Test"
      ? rawTestName
      : orgName
      ? `${orgName} Results`
      : "Profile Test Results";

  const card = data
    ? getProfileCardImage(data.org_slug, data.top_profile_code)
    : null;

  // ---------------------------------------------------------------------------
  // Early exits
  // ---------------------------------------------------------------------------

  if (!tid) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
        <main className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-2xl font-semibold">Personalised result</h1>
          <p className="mt-3 text-sm text-slate-300">
            This page expects a <code>?tid=</code> query parameter.
          </p>
        </main>
      </div>
    );
  }

  // ⏳ If we are in the process of redirecting to QSC, show a nice loader
  if (qscRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
        <main className="mx-auto max-w-3xl px-4 py-10 space-y-4">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Redirecting to your Quantum Source Code...
          </h1>
          <p className="text-sm text-slate-300">
            We&apos;re preparing your Buyer Persona Snapshot and Matrix view.
          </p>
          <div className="mt-6 h-1 w-40 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full w-1/2 animate-pulse bg-sky-500" />
          </div>
        </main>
      </div>
    );
  }

  // 🔒 If this link is configured to hide results, show the custom message instead
  if (shouldHideResults) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
        <main className="mx-auto max-w-3xl px-4 py-10 space-y-6">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/80">
              Result
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">
              {heading}
            </h1>
            <p className="mt-1 text-sm text-slate-300">{orgName}</p>
          </header>

          <section className="rounded-2xl bg-slate-950/70 border border-slate-700/70 p-6 md:p-8 shadow-xl shadow-black/40">
            <h2 className="text-xl font-semibold mb-3 text-slate-50">
              Thank you for completing this assessment
            </h2>
            <p className="text-sm text-slate-200 whitespace-pre-line">
              {hiddenMessage}
            </p>
          </section>

          {meta?.redirect_url && (
            <div>
              <a
                href={meta.redirect_url}
                className="inline-flex items-center px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-medium hover:bg-sky-500 shadow"
              >
                Continue
              </a>
            </div>
          )}

          <footer className="pt-8 text-xs text-slate-500">
            © {new Date().getFullYear()} MindCanvas — Profiletest.ai
          </footer>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
        <main className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-2xl font-semibold">Loading result…</h1>
        </main>
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
        <main className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-2xl font-semibold">Couldn’t load result</h1>
          <pre className="mt-4 p-3 rounded bg-slate-950 text-slate-100 whitespace-pre-wrap border border-slate-700">
{err || "No data"}
          </pre>
          <div className="text-sm text-slate-400 mt-3">
            Debug link:{" "}
            <a
              className="underline"
              href={`/api/public/test/${token}/result?tid=${encodeURIComponent(
                tid
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              /api/public/test/{token}/result?tid=…
            </a>
          </div>
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main rendered result (non-QSC tests)
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 md:py-10 space-y-10">
        {/* HEADER + PROFILE CARD */}
        <header className="border-b border-slate-800 pb-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/80">
                Result
              </p>
              <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-slate-50">
                {heading}
              </h1>
              <p className="mt-1 text-sm text-slate-300">{orgName}</p>
              <p className="mt-3 text-sm text-slate-200">
                Top Profile:{" "}
                <span className="font-semibold">
                  {data.top_profile_name}
                </span>
              </p>

              <div className="mt-4">
                <Link
                  href={`/t/${encodeURIComponent(
                    token
                  )}/report?tid=${encodeURIComponent(tid)}`}
                  className="inline-flex items-center px-4 py-2 rounded-xl border border-sky-500/60 bg-slate-900/60 text-sm font-medium text-slate-50 hover:bg-sky-600/70 hover:border-sky-400 transition shadow-md shadow-black/40"
                >
                  View your personalised report →
                </Link>
              </div>
            </div>

            {card && (
              <div className="w-[160px] h-[160px] rounded-3xl bg-sky-500/10 border border-sky-400/40 shadow-xl shadow-sky-900/50 overflow-hidden flex items-center justify-center">
                <img
                  src={card.src}
                  alt={card.alt}
                  className="h-full w-full object-contain"
                />
              </div>
            )}
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="space-y-10">
          {/* Frequency mix */}
          <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 md:p-7 shadow-lg shadow-black/40">
            <h2 className="text-xl font-semibold mb-4 text-slate-50">
              Frequency mix
            </h2>
            <div className="grid gap-3">
              {data.frequency_labels.map((f) => (
                <div
                  key={f.code}
                  className="grid grid-cols-12 items-center gap-3"
                >
                  <div className="col-span-4 md:col-span-3 text-sm text-slate-100">
                    <span className="font-medium">{f.name}</span>
                    <span className="text-slate-400 ml-2">
                      ({f.code})
                    </span>
                  </div>
                  <div className="col-span-8 md:col-span-9">
                    <Bar pct={freq[f.code]} />
                    <div className="text-xs text-slate-400 mt-1">
                      {Math.round((freq[f.code] || 0) * 100)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Profile mix */}
          <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 md:p-7 shadow-lg shadow-black/40">
            <h2 className="text-xl font-semibold mb-4 text-slate-50">
              Profile mix
            </h2>
            <div className="grid gap-3">
              {data.profile_labels.map((p) => (
                <div
                  key={p.code}
                  className="grid grid-cols-12 items-center gap-3"
                >
                  <div className="col-span-4 md:col-span-3 text-sm text-slate-100">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-slate-400 ml-2">
                      ({p.code.replace("PROFILE_", "P")})
                    </span>
                  </div>
                  <div className="col-span-8 md:col-span-9">
                    <Bar pct={prof[p.code] || 0} />
                    <div className="text-xs text-slate-400 mt-1">
                      {Math.round((prof[p.code] || 0) * 100)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>

        <footer className="pt-4 text-sm text-slate-500">
          © {new Date().getFullYear()} MindCanvas — Profiletest.ai
        </footer>
      </div>
    </div>
  );
}


