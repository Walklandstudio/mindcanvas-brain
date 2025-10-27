'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type LinkRow = { id: string; token: string; use_count?: number; max_uses?: number | null };

export default function TestDetailsClient({
  slug,
  testId,
}: {
  slug: string;
  testId: string;
}) {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const base = useMemo(() => {
    const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
    if (env) return env;
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
  }, []);

  const loadLinks = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const r = await fetch(`/api/tests/${testId}/links`, { cache: 'no-store' });
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        setError(`Failed to load links (HTTP ${r.status})${text ? ` — ${text}` : ''}`);
        setLinks([]);
        return;
      }
      const j = await r.json().catch(() => ({}));
      if (!j?.ok) {
        setError(j?.error || 'Unknown error');
        setLinks([]);
        return;
      }
      setLinks(Array.isArray(j.links) ? j.links : []);
    } catch (e: any) {
      setError(String(e?.message || e));
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const createLink = async () => {
    try {
      setBusy(true);
      setError('');
      const r = await fetch(`/api/tests/${testId}/create-link`, { method: 'POST' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        setError(j?.error || `Create link failed (HTTP ${r.status})`);
        return;
      }
      await loadLinks();
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const sampleToken = links[0]?.token ?? 'TOKEN';
  const publicUrl = base ? `${base}/t/${sampleToken}` : `/t/${sampleToken}`;
  const embed = `<iframe src="${publicUrl}" width="100%" height="800" frameborder="0"></iframe>`;
  const codeSnippet = `fetch('${base || ''}/api/public/test/${sampleToken}/questions').then(r=>r.json())`;

  return (
    <div className="p-6 space-y-5 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Test Details</h1>
        <button
          onClick={createLink}
          disabled={busy}
          className="px-3 py-2 rounded border border-white/20 hover:bg-white/10 disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create Link'}
        </button>
      </div>

      {loading && <div className="text-white/70">Loading links…</div>}
      {!loading && error && (
        <div className="text-red-300 whitespace-pre-wrap">{error}</div>
      )}

      {!loading && !error && (
        <>
          <section>
            <div className="font-medium mb-2">Links</div>
            {links.length === 0 ? (
              <div className="text-white/70">No links yet. Click “Create Link”.</div>
            ) : (
              <ul className="space-y-1">
                {links.map((l) => (
                  <li key={l.id} className="text-sm">
                    <code>/t/{l.token}</code>
                    {typeof l.use_count === 'number' && (
                      <span className="text-white/60">
                        {' '}· uses {l.use_count}{l.max_uses ? `/${l.max_uses}` : ''}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <div className="font-medium mb-2">Embed</div>
            <pre className="p-2 bg-white text-black rounded border whitespace-pre-wrap">{embed}</pre>
          </section>

          <section>
            <div className="font-medium mb-2">Code Snippet</div>
            <pre className="p-2 bg-white text-black rounded border whitespace-pre-wrap">{codeSnippet}</pre>
          </section>
        </>
      )}
    </div>
  );
}
