"use client";

import Link from "next/link";
import Image from "next/image"; // 🔹 NEW
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
};

// 🔹 NEW: map profile names → image paths in /public
const PROFILE_IMAGE_BY_NAME: Record<string, string> = {
  // Adjust keys to match your actual top_profile_name values exactly
  Controller: "/profile-cards/controller.png",
  // e.g.
  // "Visionary": "/profile-cards/visionary.png",
  // "Optimiser": "/profile-cards/optimiser.png",
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
  const tid = sp?.get("tid") ?? "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [data, setData] = useState<ReportData | null>(null);

  const [meta, setMeta] = useState<LinkMeta | null>(null);

  // Load result data
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

  // Load link meta (to see if results should be hidden)
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

  const freq = useMemo(
    () => data?.frequency_percentages ?? { A: 0, B: 0, C: 0, D: 0 },
    [data]
  );
  const prof = useMemo(
    () => data?.profile_percentages ?? {},
    [data]
  );

  const shouldHideResults =
    meta?.show_results === false &&
    (meta.hidden_results_message ?? "").trim().length > 0;

  const hiddenMessage = (meta?.hidden_results_message ?? "").trim();
  const orgName = meta?.org_name || data?.org_slug || "your organisation";
  const testName = meta?.name || data?.test_name || "Profile Test";

  // 🔹 NEW: compute image for the top profile (safe fallback)
  const topProfileName = data?.top_profile_name || "";
  const topProfileImageSrc =
    topProfileName && PROFILE_IMAGE_BY_NAME[topProfileName]
      ? PROFILE_IMAGE_BY_NAME[topProfileName]
      : null;

  if (!tid) {
    return (
      <div className="min-h-screen p-6">
        <h1 className="text-2xl font-semibold">Missing taker ID</h1>
        <p className="text-gray-600 mt-2">
          This page expects a <code>?tid=</code> query parameter.
        </p>
      </div>
    );
  }

  // 🔒 If this link is configured to hide results, show the custom message instead
  if (shouldHideResults) {
    return (
      <div className="min-h-screen p-6 md:p-10 bg-gradient-to-b from-white to-slate-50">
        <main className="max-w-3xl mx-auto space-y-6">
          <header>
            <p className="text-sm text-gray-500">{orgName}</p>
            <h1 className="text-3xl md:text-4xl font-bold mt-1">
              {testName}
            </h1>
          </header>

          <section className="rounded-2xl bg-white border border-gray-200 p-6 md:p-8">
            <h2 className="text-xl font-semibold mb-3">
              Thank you for completing this assessment
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {hiddenMessage}
            </p>
          </section>

          {meta?.redirect_url && (
            <div>
              <a
                href={meta.redirect_url}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
              >
                Continue
              </a>
            </div>
          )}

          <footer className="pt-8 text-xs text-gray-500">
            © {new Date().getFullYear()} MindCanvas — Profiletest.ai
          </footer>
        </main>
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
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-10 bg-gradient-to-b from-white to-slate-50">
      <header className="max-w-5xl mx-auto">
        <p className="text-sm text-gray-500">{data.org_slug} • Result</p>
        <h1 className="text-3xl md:text-4xl font-bold mt-1">
          {data.test_name || "Profile Test"}
        </h1>
        <p className="text-gray-700 mt-2">
          Top Profile:{" "}
          <span className="font-semibold">
            {data.top_profile_name}
          </span>
        </p>

        {/* 🔹 NEW: top profile image */}
        {topProfileImageSrc && (
          <div className="mt-4">
            <div className="inline-flex items-center rounded-2xl bg-sky-50 px-4 py-3 shadow-sm border border-sky-100">
              <Image
                src={topProfileImageSrc}
                alt={topProfileName}
                width={160}
                height={160}
                className="h-32 w-32 object-contain"
              />
            </div>
          </div>
        )}

        <div className="mt-6">
          <Link
            href={`/t/${encodeURIComponent(
              token
            )}/report?tid=${encodeURIComponent(tid)}`}
            className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-900"
          >
            View your personalised report →
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto mt-8 space-y-10">
        {/* Frequency mix */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Frequency mix</h2>
          <div className="grid gap-3">
            {data.frequency_labels.map((f) => (
              <div
                key={f.code}
                className="grid grid-cols-12 items-center gap-3"
              >
                <div className="col-span-3 md:col-span-2 text-sm text-gray-700">
                  <span className="font-medium">{f.name}</span>
                  <span className="text-gray-500 ml-2">
                    ({f.code})
                  </span>
                </div>
                <div className="col-span-9 md:col-span-10">
                  <Bar pct={freq[f.code]} />
                  <div className="text-xs text-gray-500 mt-1">
                    {Math.round((freq[f.code] || 0) * 100)}%
                  </div>
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
              <div
                key={p.code}
                className="grid grid-cols-12 items-center gap-3"
              >
                <div className="col-span-3 md:col-span-2 text-sm text-gray-700">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-gray-500 ml-2">
                    ({p.code.replace("PROFILE_", "P")})
                  </span>
                </div>
                <div className="col-span-9 md:col-span-10">
                  <Bar pct={prof[p.code] || 0} />
                  <div className="text-xs text-gray-500 mt-1">
                    {Math.round((prof[p.code] || 0) * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="max-w-5xl mx-auto py-10 text-sm text-gray-500">
        <div>
          © {new Date().getFullYear()} MindCanvas — Profiletest.ai
        </div>
      </footer>
    </div>
  );
}


