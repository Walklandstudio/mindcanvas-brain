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

async function createLink(testId: string) {
  const res = await fetch(`/api/tests/${testId}/links`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { id, token, ... }
}

export default function TestsClient({ org, tests, linksByTest }: any) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [state, setState] = useState<Record<string, any[]>>(linksByTest || {});

  const onGenerate = async (testId: string) => {
    try {
      setBusyId(testId);
      const link = await createLink(testId);
      setState(s => ({ ...s, [testId]: [link, ...(s[testId] || [])] }));
    } catch (e:any) {
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
      <h2 className="text-xl font-semibold">Tests</h2>
      {tests.length === 0 && <div className="text-gray-500">No tests found.</div>}
      <ul className="space-y-4">
        {tests.map((t:any) => {
          const links = state[t.test_id] || [];
          return (
            <li key={t.test_id} className="border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{t.test_name}</div>
                  <div className="text-sm text-gray-500">{t.test_id}</div>
                </div>
                <button
                  onClick={() => onGenerate(t.test_id)}
                  disabled={busyId === t.test_id}
                  className="px-3 py-2 rounded-lg bg-black text-white disabled:opacity-50">
                  {busyId === t.test_id ? "Generating…" : "Generate link"}
                </button>
              </div>

              {links.length > 0 && (
                <div className="space-y-3">
                  {links.map((l:any) => {
                    const testUrl  = appUrl(`/t/${l.token}`);
                    const resultUrlHint = appUrl(`/t/${l.token}/result`);
                    const embed = embedCode(l.token);
                    return (
                      <div key={l.id} className="rounded-lg border p-3">
                        <div className="text-sm text-gray-500">Token</div>
                        <div className="font-mono text-sm">{l.token}</div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <a className="px-3 py-2 rounded-lg border" href={testUrl} target="_blank" rel="noreferrer">Open test</a>
                          <button className="px-3 py-2 rounded-lg border" onClick={() => copy(testUrl)}>Copy link</button>
                          <button className="px-3 py-2 rounded-lg border" onClick={() => copy(embed)}>Copy embed</button>
                          <button className="px-3 py-2 rounded-lg border" onClick={() => copy(resultUrlHint)}>Copy result URL (hint)</button>
                        </div>

                        <div className="mt-2 text-xs text-gray-500">
                          Use <span className="font-mono">/t/{l.token}</span> for direct, or paste the iframe on external sites.
                        </div>
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
