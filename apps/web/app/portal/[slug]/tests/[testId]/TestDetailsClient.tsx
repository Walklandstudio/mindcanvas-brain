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
  const [copied, setCopied] = useState<string>('');

  const base = useMemo(() => {
    const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
    if (env) return env;
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
  }, []);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 1200);
    } catch {
      setCopied(''); // noop
    }
  };

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
          {/* Links list */}
          <section className="space-y-2">
            <div className="font-medium mb-1">Links</div>
            {links.length === 0 ? (
              <div className="text-white/70">No links yet. Click “Create Link”.</div>
            ) : (
              <ul className="space-y-2">
                {links.map((l) => {
                  const url = base ? `${base}/t/${l.token}` : `/t/${l.token}`;
                  return (
                    <li key={l.id} className="text-sm flex items-center gap-3">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline break-all"
                        title="Open public test link"
                      >
                        {url}
                      </a>
                      <button
                        onClick={() => copy(url, 'url')}
                        className="px-2 py-1 rounded border border-white/20 hover:bg-white/10 text-xs"
                        title="Copy URL"
                      >
                        Copy URL
                      </button>
                      <span className="text-white/60">
                        · uses {l.use_count ?? 0}{l.max_uses ? `/${l.max_uses}` : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Embed */}
          <section className="space-y-2">
            <div className="font-medium">Embed</div>
            <pre className="p-2 bg-white text-black rounded border whitespace-pre-wrap">{embed}</pre>
            <div className="flex gap-2">
              <button
                onClick={() => copy(embed, 'embed')}
                className="px-3 py-2 rounded border border-white/20 hover:bg-white/10 text-sm"
              >
                Copy Embed
              </button>
              <button
                onClick={() => window.open(publicUrl, '_blank')}
                className="px-3 py-2 rounded border border-white/20 hover:bg-white/10 text-sm"
              >
                Open Public Link
              </button>
            </div>
          </section>

          {/* Code Snippet */}
          <section className="space-y-2">
            <div className="font-medium">Code Snippet</div>
            <pre className="p-2 bg-white text-black rounded border whitespace-pre-wrap">{codeSnippet}</pre>
            <button
              onClick={() => copy(codeSnippet, 'code')}
              className="px-3 py-2 rounded border border-white/20 hover:bg-white/10 text-sm"
            >
              Copy Snippet
            </button>
          </section>

          {/* Tiny toast */}
          {!!copied && (
            <div className="fixed bottom-4 right-4 px-3 py-2 rounded bg-white/10 border border-white/20 text-xs">
              Copied {copied} to clipboard
            </div>
          )}
        </>
      )}
    </div>
  );
}
