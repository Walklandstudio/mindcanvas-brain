// apps/web/app/t/[token]/report/ReportGateClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppBackground from "@/components/ui/AppBackground";

import LegacyReportClient from "./LegacyReportClient"; // ✅ LEAD storage renderer
import LegacyOrgReportClient from "./LegacyOrgReportClient"; // ✅ Team Puzzle / Competency Coach + base legacy renderer

type GateMode = "loading" | "storage" | "legacy" | "error";

type GateAPI = {
  ok: boolean;
  data?: {
    sections?: any | null;
    debug?: { useStorageFramework?: boolean };
    version?: string;
  };
  // some report routes also return these:
  redirect?: string | null;
  show_results?: boolean;
  next_steps_url?: string | null;
  hidden_results_message?: string | null;

  error?: string;
};

export default function ReportGateClient(props: { token: string; tid: string }) {
  const { token, tid } = props;

  const searchParams = useSearchParams();
  const src = (searchParams?.get("src") || "").trim(); // e.g. "portal"

  const [mode, setMode] = useState<GateMode>("loading");
  const [err, setErr] = useState<string | null>(null);

  // Optional: show what decision was made (helps debug quickly without guessing)
  const [decisionDebug, setDecisionDebug] = useState<{
    url?: string;
    version?: string;
    useStorageFramework?: boolean;
    decided?: "storage" | "legacy";
    src?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setMode("loading");
        setErr(null);
        setDecisionDebug(null);

        if (!tid) {
          setMode("error");
          setErr("This page expects a ?tid= parameter.");
          return;
        }

        const baseUrl = `/api/public/test/${encodeURIComponent(
          token
        )}/report?tid=${encodeURIComponent(tid)}`;

        // ✅ Forward portal signal (so backend can bypass redirect/show_results rules)
        const url = src ? `${baseUrl}&src=${encodeURIComponent(src)}` : baseUrl;

        const res = await fetch(url, { cache: "no-store" });
        const ct = res.headers.get("content-type") ?? "";

        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(
            `Non-JSON response (${res.status}): ${text.slice(0, 200)}`
          );
        }

        const json = (await res.json()) as GateAPI;

        if (!res.ok || json.ok === false) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }

        // ✅ Optional safety:
        // If API is telling public users to redirect (show_results=false),
        // respect it for public viewers, but NEVER for portal viewers.
        if (src !== "portal") {
          const redirectUrl =
            (typeof json.redirect === "string" ? json.redirect : "") ||
            (typeof json.next_steps_url === "string" ? json.next_steps_url : "");

          if (json.show_results === false && redirectUrl) {
            if (!cancelled && typeof window !== "undefined") {
              window.location.href = redirectUrl;
              return;
            }
          }
        }

        // ✅ FIX:
        // Do NOT treat "sections" as proof of storage.
        // Legacy responses can also contain sections.
        // Only use explicit opt-in signals.
        const explicitStorageFlag = Boolean(
          json.data?.debug?.useStorageFramework
        );
        const version = String(json.data?.version || "");
        const versionSuggestsStorage =
          version.toLowerCase().includes("storage") ||
          version.toLowerCase().includes("portal-v2");

        const useStorage = explicitStorageFlag || versionSuggestsStorage;

        if (cancelled) return;

        setDecisionDebug({
          url,
          version: json.data?.version,
          useStorageFramework: json.data?.debug?.useStorageFramework,
          decided: useStorage ? "storage" : "legacy",
          src,
        });

        setMode(useStorage ? "storage" : "legacy");
      } catch (e: any) {
        if (cancelled) return;
        setMode("error");
        setErr(String(e?.message || e));
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token, tid, src]);

  if (mode === "loading") {
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

  if (mode === "error") {
    return (
      <div className="min-h-screen bg-[#050914] text-white">
        <AppBackground />
        <main className="relative z-10 mx-auto max-w-4xl p-6 space-y-4">
          <h1 className="text-2xl font-semibold">Personalised report</h1>
          <p className="text-sm text-red-400">Could not load your report.</p>
          <details className="rounded-lg border border-slate-700 bg-slate-950 p-4 text-xs text-slate-50">
            <summary className="cursor-pointer font-medium">
              Debug information
            </summary>
            <div className="mt-2 space-y-2">
              <div>Error: {err ?? "Unknown"}</div>
              {decisionDebug?.url ? <div>URL: {decisionDebug.url}</div> : null}
              {decisionDebug?.src ? <div>src: {decisionDebug.src}</div> : null}
            </div>
          </details>
        </main>
      </div>
    );
  }

  // ✅ LEAD (storage) renderer
  if (mode === "storage") {
    return <LegacyReportClient token={token} tid={tid} />;
  }

  // ✅ Team Puzzle / Competency Coach / base legacy renderer
  return <LegacyOrgReportClient token={token} tid={tid} />;
}

