"use client";

import { useEffect, useState } from "react";

type Test = {
  id: string;
  name: string | null;
  slug: string | null;
  is_active: boolean | null;
  kind: string | null;
};

type LinkRow = { id: string; token: string };

export default function TestsPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<Record<string, boolean>>({});
  const [newLinks, setNewLinks] = useState<Record<string, LinkRow | null>>({});

  // Load tests for the organization
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/portal/list-tests?org=${encodeURIComponent(slug)}`, {
          cache: "no-store",
        });
        const txt = await r.text();
        let j: any;
        try {
          j = txt ? JSON.parse(txt) : {};
        } catch {
          j = { error: `Invalid JSON from API: ${txt.slice(0, 120)}` };
        }

        if (!r.ok) throw new Error(j.error || `Failed to load tests (${r.status})`);
        if (alive) setTests(j.tests ?? []);
      } catch (e: any) {
        if (alive) setError(e.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  // Create a test link
  const createLink = async (testId: string) => {
    setCreating((m) => ({ ...m, [testId]: true }));
    try {
      const r = await fetch(`/api/tests/${testId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_uses: 1, expires_at: null }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Create link failed");
      if (!j.link?.token) throw new Error("API did not return link token");
      setNewLinks((m) => ({ ...m, [testId]: { id: j.link.id, token: j.link.token } }));
    } catch (e: any) {
      alert(e.message || String(e));
    } finally {
      setCreating((m) => ({ ...m, [testId]: false }));
    }
  };

  // Handle states
  if (loading) return <div className="p-6 text-slate-500">Loading tests…</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!tests.length)
    return <div className="p-6 text-slate-500">No tests found for this org.</div>;

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Tests</h1>

      <div className="space-y-4">
        {tests.map((t) => {
          const link = newLinks[t.id];
          return (
            <div key={t.id} className="bg-white border rounded p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-base font-semibold">
                    {t.name ?? t.slug ?? t.id}
                  </div>
                  <div className="text-xs font-mono text-slate-600">
                    {t.slug ?? t.id}
                  </div>
                  <div className="text-xs text-slate-500">
                    {t.kind ?? "full"} · {t.is_active ? "active" : "archived"}
                  </div>
                </div>

                <div className="flex gap-2">
                  <a
                    href={`/portal/${slug}/tests/${t.id}`}
                    className="px-3 py-2 rounded bg-gray-900 text-white hover:opacity-90"
                  >
                    Open
                  </a>
                  <button
                    className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                    disabled={!!creating[t.id]}
                    onClick={() => createLink(t.id)}
                  >
                    {creating[t.id] ? "Creating…" : "Create link (API)"}
                  </button>
                </div>
              </div>

              {link && (
                <div className="grid md:grid-cols-3 gap-3 mt-3">
                  <div className="bg-gray-50 rounded p-3">
                    <div className="font-medium mb-1 text-sm">Direct Link</div>
                    <code className="text-xs break-all">
                      {origin
                        ? `${origin}/t/${link.token}/start`
                        : `/t/${link.token}/start`}
                    </code>
                  </div>

                  <div className="bg-gray-50 rounded p-3">
                    <div className="font-medium mb-1 text-sm">Embed (iframe)</div>
                    <code className="text-xs whitespace-pre-wrap break-all">
                      {`<iframe src="${origin}/t/${link.token}" width="100%" height="800" frameborder="0"></iframe>`}
                    </code>
                  </div>

                  <div className="bg-gray-50 rounded p-3">
                    <div className="font-medium mb-1 text-sm">Code Snippet (script)</div>
                    <code className="text-xs whitespace-pre-wrap break-all">
                      {`<div id="mindcanvas-test" data-token="${link.token}"></div>\n<script src="${origin}/embed.js" async></script>`}
                    </code>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
