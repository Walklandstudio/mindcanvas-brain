"use client";

import { useEffect, useState } from "react";
import { getBaseUrl } from "@/lib/server-url";

// IMPORTANT:
// - LegacyReportClient is your existing working Team Puzzle / CC report page code,
//   moved into a component (no logic changes).
import LegacyReportClient from "./LegacyReportClient";

// New renderer for storage/framework-driven reports
import FrameworkReportClient from "./FrameworkReportClient";

type AnyJson = any;

function pickReportFramework(metaJson: AnyJson) {
  const root = metaJson?.data ?? metaJson ?? {};
  const meta = root?.meta ?? root?.test?.meta ?? root?.row?.meta ?? root?.test_meta ?? null;
  const rf =
    meta?.reportFramework ||
    root?.reportFramework ||
    root?.meta?.reportFramework ||
    null;

  const bucket = rf?.bucket ? String(rf.bucket) : "";
  const path = rf?.path ? String(rf.path) : "";
  const version = rf?.version ? String(rf.version) : "";

  if (!bucket || !path) return null;
  return { bucket, path, version };
}

export default function ReportRouterClient({ token, tid }: { token: string; tid: string }) {
  const [mode, setMode] = useState<"loading" | "framework" | "legacy">("loading");
  const [rf, setRf] = useState<{ bucket: string; path: string; version?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const base = await getBaseUrl();

        // 1) Try read the public test meta endpoint
        const metaRes = await fetch(`${base}/api/public/test/${encodeURIComponent(token)}`, {
          cache: "no-store",
        });

        if (!metaRes.ok) {
          if (!cancelled) setMode("legacy");
          return;
        }

        const metaJson = await metaRes.json().catch(() => null);
        const reportFramework = pickReportFramework(metaJson);

        // If a reportFramework is present => use the new renderer
        if (reportFramework) {
          if (cancelled) return;
          setRf(reportFramework);
          setMode("framework");
          return;
        }

        // Otherwise => legacy renderer
        if (!cancelled) setMode("legacy");
      } catch {
        if (!cancelled) setMode("legacy");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!tid) {
    // Both renderers expect tid; keep a single friendly message here.
    return (
      <div className="mx-auto max-w-4xl p-6 text-white">
        <h1 className="text-2xl font-semibold">Personalised report</h1>
        <p className="mt-3 text-sm text-slate-300">
          This page expects a <code>?tid=</code> parameter.
        </p>
      </div>
    );
  }

  if (mode === "loading") {
    return (
      <div className="mx-auto max-w-4xl p-6 text-white">
        <h1 className="text-2xl font-semibold">Personalised report</h1>
        <p className="mt-3 text-sm text-slate-300">Loading…</p>
      </div>
    );
  }

  if (mode === "framework" && rf) {
    return <FrameworkReportClient token={token} tid={tid} reportFramework={rf} />;
  }

  return <LegacyReportClient token={token} tid={tid} />;
}
