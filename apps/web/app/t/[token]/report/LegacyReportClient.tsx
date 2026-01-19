// apps/web/app/t/[token]/report/LegacyReportClient.tsx
"use client";

import { useEffect, useState } from "react";
import AppBackground from "@/components/ui/AppBackground";

type StorageReportAPI = {
  ok: boolean;
  data?: {
    version?: string;
    sections?: any;
    debug?: Record<string, any>;
  };
  error?: string;
};

function safeString(v: any): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export default function LegacyReportClient(props: { token: string; tid: string }) {
  const { token, tid } = props;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payload, setPayload] = useState<StorageReportAPI | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setLoadError(null);
        setPayload(null);

        if (!tid) {
          setLoadError("This page expects a ?tid= parameter.");
          setLoading(false);
          return;
        }

        // IMPORTANT: use relative URL (works in all envs, avoids base-url issues)
        const url = `/api/public/test/${encodeURIComponent(
          token
        )}/report?tid=${encodeURIComponent(tid)}`;

        const res = await fetch(url, { cache: "no-store" });

        const text = await res.text();
        let json: StorageReportAPI | null = null;
        try {
          json = text ? (JSON.parse(text) as StorageReportAPI) : null;
        } catch {
          throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
        }

        if (!res.ok || !json || json.ok === false) {
          throw new Error(json?.error || `HTTP ${res.status}`);
        }

        if (cancelled) return;

        setPayload(json);
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

  if (loading) {
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

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#050914] text-white">
        <AppBackground />
        <main className="relative z-10 mx-auto max-w-4xl p-6 space-y-4">
          <h1 className="text-2xl font-semibold">Personalised report</h1>
          <p className="text-sm text-red-400">Could not load your report.</p>
          <details className="rounded-lg border border-slate-700 bg-slate-950 p-4 text-xs text-slate-50">
            <summary className="cursor-pointer font-medium">Debug information</summary>
            <div className="mt-2 space-y-2">
              <div>Error: {loadError}</div>
              <div>token: {token}</div>
              <div>tid: {tid}</div>
            </div>
          </details>
        </main>
      </div>
    );
  }

  // Storage payload shape can vary; render safely and visibly.
  const sections = payload?.data?.sections;

  // If sections isn’t in a known renderable format, show payload so you can confirm what’s coming back.
  const sectionsIsArray = Array.isArray(sections);

  return (
    <div className="min-h-screen bg-[#050914] text-white">
      <AppBackground />
      <main className="relative z-10 mx-auto max-w-5xl p-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Personalised report</h1>
          <p className="text-sm text-slate-300">
            Storage framework renderer
            {payload?.data?.version ? ` · ${payload.data.version}` : ""}
          </p>
        </header>

        {sectionsIsArray ? (
          <div className="space-y-6">
            {sections.map((s: any, idx: number) => {
              const title =
                s?.title || s?.heading || s?.name || `Section ${idx + 1}`;
              const body =
                s?.body ?? s?.content ?? s?.text ?? s?.copy ?? null;

              return (
                <section
                  key={s?.id || s?.key || idx}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <h2 className="text-lg font-semibold">{safeString(title)}</h2>

                  {body ? (
                    <div className="mt-3 whitespace-pre-wrap text-sm text-slate-200">
                      {typeof body === "string" ? body : safeString(body)}
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-slate-400">
                      (No renderable body found — section keys:{" "}
                      {Object.keys(s || {}).join(", ")})
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-200">
              Sections payload isn’t an array. Here’s the raw response so we can wire the correct renderer.
            </p>
            <pre className="mt-4 overflow-auto text-xs text-slate-100">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}
