"use client";
import { useEffect, useMemo, useState } from "react";

type Test = { id: string; name: string | null; slug: string | null };
type LinkRow = { id: string; token: string; expires_at: string | null; max_uses: number | null; use_count: number | null };

export default function TestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<string>("");
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [newLink, setNewLink] = useState<LinkRow | null>(null);

  useEffect(() => {
    // SIMPLE fetch — replace with your API route if you have one
    fetch("/api/public/tests")
      .then(r => r.json())
      .then(d => setTests(d.tests ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedTest) return;
    fetch(`/api/tests/${selectedTest}/links`)
      .then(r => r.json())
      .then(d => setLinks(d.links ?? []))
      .catch(() => {});
  }, [selectedTest]);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const embedFor = (token: string) => ({
    direct: `${baseUrl}/t/${token}/start`,
    iframe: `<iframe src="${baseUrl}/t/${token}" width="100%" height="800" frameborder="0"></iframe>`,
    script: `<div id="mindcanvas-test" data-token="${token}"></div>\n<script src="${baseUrl}/embed.js" async></script>`,
  });

  const onCreateLink = async () => {
    if (!selectedTest) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/tests/${selectedTest}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_uses: null, expires_at: null }),
      });
      const d = await res.json();
      if (d?.link) {
        setNewLink(d.link);
        setLinks(prev => [d.link, ...prev]);
      }
    } finally {
      setCreating(false);
    }
  };

  const embed = useMemo(() => (newLink ? embedFor(newLink.token) : null), [newLink]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Tests</h1>

      <div className="bg-white border rounded p-4 space-y-4">
        <label className="text-sm font-medium">Select a test</label>
        <select
          className="mt-1 w-full border rounded px-3 py-2"
          value={selectedTest}
          onChange={(e) => setSelectedTest(e.target.value)}
        >
          <option value="" disabled>— choose —</option>
          {tests.map(t => (
            <option key={t.id} value={t.id}>{t.name ?? t.slug ?? t.id}</option>
          ))}
        </select>

        <button
          onClick={onCreateLink}
          disabled={!selectedTest || creating}
          className="px-3 py-2 bg-black text-white rounded disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create Link"}
        </button>

        {newLink && (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded p-3">
              <div className="font-semibold mb-1">Direct Link</div>
              <code className="text-xs break-all">{embed!.direct}</code>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <div className="font-semibold mb-1">Embed (iframe)</div>
              <code className="text-xs whitespace-pre-wrap break-all">{embed!.iframe}</code>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <div className="font-semibold mb-1">Code Snippet (script)</div>
              <code className="text-xs whitespace-pre-wrap break-all">{embed!.script}</code>
            </div>
          </div>
        )}
      </div>

      {selectedTest && (
        <div className="bg-white border rounded p-4">
          <div className="font-medium mb-2">Existing Links</div>
          <div className="space-y-2">
            {links.map(l => {
              const e = embedFor(l.token);
              return (
                <div key={l.id} className="border rounded p-3 flex flex-col gap-1">
                  <div className="text-sm">Token: <span className="font-mono">{l.token}</span></div>
                  <div className="text-xs text-gray-500">
                    Uses: {l.use_count ?? 0} {l.max_uses ? `/ ${l.max_uses}` : "(unlimited)"} • Expires: {l.expires_at ?? "—"}
                  </div>
                  <div className="text-xs break-all">
                    Direct: <a className="text-blue-600 underline" href={e.direct} target="_blank">{e.direct}</a>
                  </div>
                </div>
              );
            })}
            {links.length === 0 && <div className="text-sm text-gray-500">No links yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
