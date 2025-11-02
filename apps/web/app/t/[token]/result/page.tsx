// apps/web/app/t/[token]/result/page.tsx
'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type AB = "A" | "B" | "C" | "D";

type FrequencyLabel = { code: AB; name: string };
type ProfileLabel = { code: string; name: string };

type ReportData = {
  org_slug: string;                 // e.g., "competency-coach" or "team-puzzle"
  test_name: string;                // human-friendly test name
  taker: { id: string };
  frequency_labels: FrequencyLabel[];
  frequency_totals: Record<AB, number>;
  frequency_percentages: Record<AB, number>;
  // Optional: 0–10 score per frequency (we'll render if present)
  frequency_scores?: Record<AB, number>;
  profile_labels: ProfileLabel[];
  profile_totals: Record<string, number>;
  profile_percentages: Record<string, number>;
  top_freq: AB;
  top_profile_code: string;
  top_profile_name: string;
  version: string;
};

function Bar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(1, Number(pct) || 0));
  const width = `${(clamped * 100).toFixed(0)}%`;
  return (
    <div className="w-full h-2 rounded bg-black/10">
      <div className="h-2 rounded bg-sky-600" style={{ width }} />
    </div>
  );
}

export default function ResultPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const sp = useSearchParams();
  const tid = sp.get("tid") || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [data, setData] = useState<ReportData | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!tid) throw new Error("Missing taker ID (?tid=)");
        setLoading(true);
        setErr("");

        const url = `/api/public/test/${encodeURIComponent(token)}/result?tid=${encodeURIComponent(tid)}`;
        const res = await fetch(url, { cache: "no-store" });
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 300)}`);
        }
        const j = await res.json();
        if (!res.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${res.status}`);

        if (alive) setData(j.data as ReportData);
      } catch (e: any) {
        if (alive) setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token, tid]);

  const freqPct = useMemo(
    () => data?.frequency_percentages ?? { A: 0, B: 0, C: 0, D: 0 },
    [data]
  );
  const freqScore = useMemo(
    () => data?.frequency_scores ?? { A: 0, B: 0, C: 0, D: 0 },
    [data]
  );
  const profPct = useMemo(() => data?.profile_percentages ?? {}, [data]);

  const freqSectionTitle = useMemo(() => {
    const slug = (data?.org_slug || "").toLowerCase();
    // CC uses Coaching Flow; Team Puzzle and others use Frequency
    return slug.includes("competency-coach") ? "Coaching Flow mix" : "Frequency mix";
  }, [data?.org_slug]);

  if (!tid) {
    return (
      <div className="min-h-screen p-6">
        <h1 className="text-2xl font-semibold">Missing taker ID</h1>
        <p className="text-gray-600 mt-2">This page expects a <code>?tid=</code> query parameter.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <h1 className="text-2xl font-semibold">Loading result…</h1>
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="min-h-screen p-6">
        <h1 className="text-2xl font-semibold">Couldn’t load result</h1>
        <pre className="mt-4 p-3 rounded bg-gray-900 text-gray-100 whitespace-pre-wrap">
{err || "No data"}
        </pre>
        <div className="text-sm text-gray-500 mt-3">
          Debug link:{" "}
          <a className="underline" href={`/api/public/test/${token}/result?tid=${encodeURIComponent(tid)}`} target="_blank" rel="noreferrer">
            /api/public/test/{token}/result?tid=…
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-10 bg-gradient-to-b from-white to-slate-50">
      <header className="max-w-5xl mx-auto">
        <p className="text-sm text-gray-500">{data.org_slug} • Result</p>
        <h1 className="text-3xl md:text-4xl font-bold mt-1">{data.test_name || "Profile Test"}</h1>
        <p className="text-gray-700 mt-2">
          Top Profile: <span className="font-semibold">{data.top_profile_name}</span>
        </p>

        <div className="mt-4">
          <Link
            href={`/t/${encodeURIComponent(token)}/report?tid=${encodeURIComponent(tid)}`}
            className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-900"
          >
            View your personalised report →
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto mt-8 space-y-10">
        {/* Frequency / Coaching Flow mix */}
        <section>
          <h2 className="text-xl font-semibold mb-4">{freqSectionTitle}</h2>
          <div className="grid gap-3">
            {data.frequency_labels.map((f) => (
              <div key={f.code} className="grid grid-cols-12 items-center gap-3">
                <div className="col-span-3 md:col-span-2 text-sm text-gray-700">
                  <span className="font-medium">{f.name}</span>
                  <span className="text-gray-500 ml-2">({f.code})</span>
                </div>
                <div className="col-span-7 md:col-span-9">
                  <Bar pct={freqPct[f.code]} />
                  <div className="text-xs text-gray-500 mt-1">
                    {Math.round((freqPct[f.code] || 0) * 100)}%
                  </div>
                </div>
                {/* Small /10 score badge */}
                <div className="col-span-2 md:col-span-1 text-right">
                  <span className="inline-flex items-center justify-center rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 bg-white">
                    {Number(freqScore[f.code] ?? 0)}/10
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Profile mix */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Profile mix</h2>
          <div className="grid gap-3">
            {data.profile_labels.map((p) => (
              <div key={p.code} className="grid grid-cols-12 items-center gap-3">
                <div className="col-span-3 md:col-span-2 text-sm text-gray-700">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-gray-500 ml-2">({p.code.replace("PROFILE_", "P")})</span>
                </div>
                <div className="col-span-9 md:col-span-10">
                  <Bar pct={profPct[p.code] || 0} />
                  <div className="text-xs text-gray-500 mt-1">
                    {Math.round((profPct[p.code] || 0) * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="max-w-5xl mx-auto py-10 text-sm text-gray-500">
        <div>© {new Date().getFullYear()} MindCanvas — Profiletest.ai</div>
      </footer>
    </div>
  );
}

