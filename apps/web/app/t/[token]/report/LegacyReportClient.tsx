// apps/web/app/t/[token]/report/ReportRouterClient.tsx
"use client";

import { useEffect, useState } from "react";
import { getBaseUrl } from "@/lib/server-url";

import LegacyReportClient from "./LegacyReportClient"; // ✅ LEAD (storage framework)
import LegacyOrgReportClient from "./LegacyOrgReportClient"; // ✅ Team Puzzle / Competency Coach (full legacy)

type ResultAPI = {
  ok: boolean;
  data?: {
    debug?: {
      useStorageFramework?: boolean;
    };
    version?: string;
  };
  error?: string;
};

export default function ReportRouterClient(props: { token: string; tid: string }) {
  const { token, tid } = props;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [useStorage, setUseStorage] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setLoadError(null);

        if (!tid) {
          setLoadError("Missing tid");
          setLoading(false);
          return;
        }

        const base = await getBaseUrl();
        const url = `${base}/api/public/test/${encodeURIComponent(
          token
        )}/report?tid=${encodeURIComponent(tid)}`;

        const res = await fetch(url, { cache: "no-store" });
        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
        }

        const json = (await res.json()) as ResultAPI;
        if (!res.ok || json.ok === false || !json.data) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }

        if (cancelled) return;

        const flag =
          Boolean(json.data?.debug?.useStorageFramework) ||
          String(json.data?.version || "").includes("storage");

        setUseStorage(flag);
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

  if (!tid) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-white">
        <h1 className="text-2xl font-semibold">Personalised report</h1>
        <p className="mt-4 text-sm text-slate-300">
          This page expects a <code>?tid=</code> parameter.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-white">
        <h1 className="text-2xl font-semibold">Personalised report</h1>
        <p className="mt-4 text-sm text-slate-300">Loading your report…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl p-6 space-y-4 text-white">
        <h1 className="text-2xl font-semibold">Personalised report</h1>
        <p className="text-sm text-red-400">Could not load your report.</p>
        <details className="rounded-lg border border-slate-700 bg-slate-950 p-4 text-xs text-slate-50">
          <summary className="cursor-pointer font-medium">Debug information</summary>
          <div className="mt-2 space-y-2">
            <div>Error: {loadError}</div>
          </div>
        </details>
      </div>
    );
  }

  // ✅ Decide renderer:
  // - Storage framework (LEAD) -> LegacyReportClient (sections)
  // - No storage framework (Team Puzzle / Competency Coach) -> LegacyOrgReportClient (full signed-off legacy)
  return useStorage ? (
    <LegacyReportClient token={token} tid={tid} />
  ) : (
    <LegacyOrgReportClient token={token} tid={tid} />
  );
}

