"use client";
import { useEffect, useState } from "react";

type Test = { id: string; name: string | null; slug: string | null; is_active?: boolean | null; kind?: string | null };
type LinkRow = { id: string; token: string; expires_at: string | null; max_uses: number | null; use_count: number | null };

export default function TestsPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [newLinks, setNewLinks] = useState<Record<string, LinkRow | null>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/portal/tests?org=${encodeURIComponent(slug)}`, { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed to load tests");
        if (!alive) return;
        setTests(j.tests ?? []);
      } catch (e: any) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [slug]);

  const onCreateLink = async (testId: string) => {
    setBusy((m) => ({ ...m, [testId]: true }));
    try {
      const r = await fetch(`/api/tests/${testId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_uses: 1, expires_at: null }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Create link failed");
      setNewLinks((m) => ({ ...m, [testId]: j.link }));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy((m) => ({ ...m, [testId]: false }));
    }
  };

  const embedFor = (token: string) => {
    const base = window.location.origin;
    return {
      direct: `${base}/t/${token}/start`,
      iframe: `<iframe src="${base}/t/${token}" width="100%" height="800" frameborder="0"></iframe>`,
      script: `<div id="mindcanvas-test" data-token="${token}"></div>\n<script src="${base}/embed.js" async></script>`,
    };
  };

  if (loading) return <div className="p-6 text-slate-500">Loading tests…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!tests.length) return <div className="p-6 text-slate-500">No tests in this org.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Tests</h1>
      <div className="space-y-4">
        {tests.map((t) => {
          const link = newLinks[t.id] ?? null;
          const embed = link ? embedFor(link.token) : null;
          return (
            <div key={t.id} className="bg-white border rounded p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-base font-semibold">{t.name ?? t.slug ?? t.id}</div>
                  <div className="text-xs font-mono text-slate-600">{t.slug ?? t.id}</div>
                  <div className="text-xs text-slate-500">
                    {t.kind ?? "full"} · {t.is_active ? "active" : "archived"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <a href={`/tests/${t.id}`} className="px-3 py-2 rounded bg-gray-900 text-white hover:opacity-90">Open</a>
                  <button
                    className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                    disabled={!!busy[t.id]}
                    onClick={() => onCreateLink(t.id)}
                  >
                    {busy[t.id] ? "Creating…" : "Create link (API)"}
                  </button>
                </div>
              </div>

              {link && (
                <div className="grid md:grid-cols-3 gap-3 mt-1">
                  <div className="bg-gray-50 rounded p-3">
                    <div className="font-medium mb-1 text-sm">Direct Link</div>
                    <code className="text-xs break-all">{embed!.direct}</code>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <div className="font-medium mb-1 text-sm">Embed (iframe)</div>
                    <code className="text-xs whitespace-pre-wrap break-all">{embed!.iframe}</code>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <div className="font-medium mb-1 text-sm">Code Snippet (script)</div>
                    <code className="text-xs whitespace-pre-wrap break-all">{embed!.script}</code>
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
