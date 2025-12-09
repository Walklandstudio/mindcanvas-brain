"use client";

import { useState } from "react";

function appUrl(path: string) {
  // If you have NEXT_PUBLIC_APP_URL set, you can switch to that later.
  return path;
}

async function createLink(testId: string, label?: string | null) {
  const res = await fetch(`/api/tests/${testId}/links`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ label: label ?? undefined }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json(); // expect { id, token, label?, ... }
}

export default function TestsClient({ org, tests, linksByTest }: any) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [state, setState] = useState<Record<string, any[]>>(
    linksByTest || {}
  );

  const onGenerate = async (test: any) => {
    // Ask the user to name this link / campaign
    const defaultLabel = test.test_name || "";
    const label = window.prompt(
      "Name this link so you can recognise it later (e.g. 'Onboarding cohort 1', 'Website footer', 'Email campaign').",
      defaultLabel
    );

    // If user cancels the prompt, don’t create anything.
    if (label === null) return;

    try {
      setBusyId(test.test_id);
      const link = await createLink(test.test_id, label.trim() || defaultLabel);
      setState((s) => ({
        ...s,
        [test.test_id]: [link, ...(s[test.test_id] || [])],
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
      <h2 className="text-xl font-semibold text-white">Tests</h2>

      {tests.length === 0 && (
        <div className="text-sm text-white/60">No tests found.</div>
      )}

      <ul className="space-y-4">
        {tests.map((t: any) => {
          const links = state[t.test_id] || [];
          const testTitle = t.test_name || "Untitled test";
          const testPurpose =
            t.test_purpose ||
            t.purpose ||
            t.description ||
            null;

          return (
            <li
              key={t.test_id}
              className="rounded-2xl border border-white/15 bg-black/40 p-4 space-y-3"
            >
              {/* Header row: test name + generate button */}
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {testTitle}
                  </div>
                  {testPurpose && (
                    <div className="mt-1 text-xs text-white/60">
                      {testPurpose}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onGenerate(t)}
                  disabled={busyId === t.test_id}
                  className="inline-flex items-center justify-center rounded-lg bg-white text-black px-3 py-2 text-xs font-medium shadow-sm hover:bg-slate-100 disabled:opacity-50"
                >
                  {busyId === t.test_id ? "Creating link…" : "Generate link"}
                </button>
              </div>

              {/* Existing links for this test */}
              {links.length > 0 && (
                <div className="mt-3 space-y-3">
                  {links.map((l: any) => {
                    const testUrl = appUrl(`/t/${l.token}`);
                    const label =
                      l.label ||
                      l.link_label ||
                      l.purpose ||
                      testTitle;

                    return (
                      <div
                        key={l.id}
                        className="rounded-xl border border-white/15 bg-black/60 p-3 space-y-2"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-white">
                              {label}
                            </div>
                            <div className="text-xs text-white/60 break-all">
                              {testUrl}
                            </div>
                            {typeof l.use_count === "number" && (
                              <div className="text-[11px] text-white/50">
                                Responses: {l.use_count}
                                {l.max_uses
                                  ? ` of ${l.max_uses} allowed`
                                  : ""}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <a
                              href={testUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center rounded-lg border border-white/30 px-3 py-1.5 text-xs text-white hover:bg-white/10"
                            >
                              Open test
                            </a>
                            <button
                              className="inline-flex items-center rounded-lg border border-white/30 px-3 py-1.5 text-xs text-white hover:bg-white/10"
                              onClick={() => copy(testUrl)}
                            >
                              Copy link
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-white/50">
                          Use this link in emails, landing pages, or campaigns.
                          The name above is just for your reporting and will
                          also be saved in the database.
                        </p>
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

