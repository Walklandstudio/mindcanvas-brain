"use client";

import { useState } from "react";

function appUrl(path: string) {
  // if you have NEXT_PUBLIC_APP_URL, prefer that; otherwise relative
  return path;
}

function embedCode(token: string) {
  const src = appUrl(`/t/${token}`);
  return `<iframe src="${src}" width="100%" height="900" style="border:0" allow="clipboard-write; encrypted-media; fullscreen"></iframe>`;
}

async function createLink(testId: string, label?: string | null) {
  const res = await fetch(`/api/tests/${testId}/links`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      label: label ?? undefined,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }

  // API returns { ok: true, link: {...} }
  return json.link || json;
}

export default function TestsClient({ org, tests, linksByTest }: any) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [state, setState] = useState<Record<string, any[]>>(linksByTest || {});

  const onGenerate = async (testId: string) => {
    try {
      // Ask for a human-friendly label (Test Name / Purpose)
      const label = window.prompt(
        "Name this link (e.g. 'Leaders cohort Jan', 'Team A onboarding'):",
        ""
      );
      if (label === null) {
        // user cancelled
        return;
      }

      setBusyId(testId);
      const link = await createLink(testId, label.trim() || null);

      setState((s) => ({
        ...s,
        [testId]: [link, ...(s[testId] || [])],
      }));
    } catch (e: any) {
      alert(`Failed to create link: ${e.message}`);
    } finally {
      setBusyId(null);
    }
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">
        Tests for {org?.name ?? org?.slug ?? "this organisation"}
      </h2>

      {tests.length === 0 && (
        <div className="text-gray-500">No tests found.</div>
      )}

      <ul className="space-y-4">
        {tests.map((t: any) => {
          const links = state[t.test_id] || [];

          return (
            <li
              key={t.test_id}
              className="border border-white/10 rounded-xl bg-white/5 p-4 space-y-3"
            >
              {/* Test header */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-white">
                    {t.test_name}
                  </div>
                  {/* No raw test_id shown to clients */}
                  <div className="text-xs text-white/50">
                    Quantum Source Code assessment
                  </div>
                </div>

                <button
                  onClick={() => onGenerate(t.test_id)}
                  disabled={busyId === t.test_id}
                  className="px-3 py-2 rounded-lg bg-black text-white text-sm border border-white/20 hover:bg-white/10 disabled:opacity-50"
                >
                  {busyId === t.test_id ? "Generating…" : "Generate link"}
                </button>
              </div>

              {/* Links for this test */}
              {links.length > 0 && (
                <div className="space-y-3 pt-2">
                  {links.map((l: any) => {
                    const testUrl = appUrl(`/t/${l.token}`);
                    const resultUrlHint = appUrl(`/t/${l.token}/result`);
                    const embed = embedCode(l.token);
                    const label =
                      (typeof l.label === "string" && l.label.trim()) ||
                      "Untitled link";

                    return (
                      <div
                        key={l.id}
                        className="rounded-lg border border-white/15 bg-black/20 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs uppercase tracking-[0.16em] text-white/50">
                              Link
                            </div>
                            <div className="text-sm font-medium text-white">
                              {label}
                            </div>
                          </div>

                          {typeof l.use_count === "number" && (
                            <div className="text-xs text-white/50">
                              Uses: {l.use_count}
                              {l.max_uses ? ` / ${l.max_uses}` : ""}
                            </div>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <a
                            className="px-3 py-2 rounded-lg border border-white/20 text-xs text-white hover:bg-white/10"
                            href={testUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open test
                          </a>
                          <button
                            className="px-3 py-2 rounded-lg border border-white/20 text-xs text-white hover:bg-white/10"
                            onClick={() => copy(testUrl)}
                          >
                            Copy link
                          </button>
                          <button
                            className="px-3 py-2 rounded-lg border border-white/20 text-xs text-white hover:bg-white/10"
                            onClick={() => copy(embed)}
                          >
                            Copy embed
                          </button>
                          <button
                            className="px-3 py-2 rounded-lg border border-white/20 text-xs text-white hover:bg-white/10"
                            onClick={() => copy(resultUrlHint)}
                          >
                            Copy result URL (hint)
                          </button>
                        </div>

                        {/* No token / test_id printed out to the client anymore */}
                      </div>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
