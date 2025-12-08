'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type LinkRow = {
  id: string;
  token: string;
  use_count?: number;
  max_uses?: number | null;
};

type TakerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company?: string | null;
  role_title?: string | null;
  status: string | null;
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  data_consent?: boolean | null;
  data_consent_at?: string | null;
};

export default function TestDetailsClient({
  slug,
  testId,
}: {
  slug: string;
  testId: string;
}) {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [takers, setTakers] = useState<TakerRow[]>([]);
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [loadingTakers, setLoadingTakers] = useState(true);
  const [copied, setCopied] = useState<string>('');
  const [showOnlyConsented, setShowOnlyConsented] = useState(false);

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
      setLoadingLinks(true);
      setError('');
      const r = await fetch(`/api/tests/${testId}/links`, { cache: 'no-store' });
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        setError(
          `Failed to load links (HTTP ${r.status})${
            text ? ` — ${text}` : ''
          }`
        );
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
      setLoadingLinks(false);
    }
  }, [testId]);

  const loadTakers = useCallback(async () => {
    try {
      setLoadingTakers(true);
      // Do not overwrite link-related error here to avoid hiding it
      const r = await fetch(`/api/tests/${testId}/takers`, {
        cache: 'no-store',
      });
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        setError((prev) =>
          prev
            ? prev +
              `\nFailed to load takers (HTTP ${r.status})${
                text ? ` — ${text}` : ''
              }`
            : `Failed to load takers (HTTP ${r.status})${
                text ? ` — ${text}` : ''
              }`
        );
        setTakers([]);
        return;
      }
      const j = await r.json().catch(() => ({}));
      if (!j?.ok) {
        setError((prev) =>
          prev ? prev + `\n${j?.error || 'Error loading takers'}` : j?.error
        );
        setTakers([]);
        return;
      }
      setTakers(Array.isArray(j.takers) ? j.takers : []);
    } catch (e: any) {
      setError((prev) =>
        prev
          ? prev + `\n${String(e?.message || e)}`
          : String(e?.message || e)
      );
      setTakers([]);
    } finally {
      setLoadingTakers(false);
    }
  }, [testId]);

  useEffect(() => {
    loadLinks();
    loadTakers();
  }, [loadLinks, loadTakers]);

  const createLink = async () => {
    try {
      setBusy(true);
      setError('');
      const r = await fetch(`/api/tests/${testId}/create-link`, {
        method: 'POST',
      });
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
  const codeSnippet = `fetch('${
    base || ''
  }/api/public/test/${sampleToken}/questions').then(r=>r.json())`;

  const filteredTakers = useMemo(() => {
    if (!showOnlyConsented) return takers;
    return takers.filter((t) => t.data_consent === true);
  }, [takers, showOnlyConsented]);

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

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

      {!!error && (
        <div className="text-red-300 whitespace-pre-wrap">{error}</div>
      )}

      {/* Links */}
      <section className="space-y-2">
        <div className="font-medium mb-1">Links</div>
        {loadingLinks ? (
          <div className="text-white/70">Loading links…</div>
        ) : links.length === 0 ? (
          <div className="text-white/70">
            No links yet. Click “Create Link”.
          </div>
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
                    · uses {l.use_count ?? 0}
                    {l.max_uses ? `/${l.max_uses}` : ''}
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
        <pre className="p-2 bg-white text-black rounded border whitespace-pre-wrap">
          {embed}
        </pre>
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
        <pre className="p-2 bg-white text-black rounded border whitespace-pre-wrap">
          {codeSnippet}
        </pre>
        <button
          onClick={() => copy(codeSnippet, 'code')}
          className="px-3 py-2 rounded border border-white/20 hover:bg-white/10 text-sm"
        >
          Copy Snippet
        </button>
      </section>

      {/* Test takers */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">Test takers</div>
          <label className="flex items-center gap-2 text-xs text-white/70">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={showOnlyConsented}
              onChange={(e) => setShowOnlyConsented(e.target.checked)}
            />
            <span>Show only with recorded consent</span>
          </label>
        </div>

        {loadingTakers ? (
          <div className="text-white/70">Loading test takers…</div>
        ) : filteredTakers.length === 0 ? (
          <div className="text-white/70">
            No test takers found for this test yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/15 bg-white/5">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-white/10 text-left">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Consent</th>
                  <th className="px-3 py-2">Consent at</th>
                </tr>
              </thead>
              <tbody>
                {filteredTakers.map((t) => {
                  const fullName = `${t.first_name || ''} ${
                    t.last_name || ''
                  }`.trim();
                  const consentLabel =
                    t.data_consent === true
                      ? 'Yes'
                      : t.data_consent === false
                      ? 'No'
                      : 'Unknown';
                  const consentClass =
                    t.data_consent === true
                      ? 'text-emerald-300'
                      : t.data_consent === false
                      ? 'text-red-300'
                      : 'text-white/60';

                  return (
                    <tr key={t.id} className="border-t border-white/10">
                      <td className="px-3 py-2">
                        {fullName || <span className="text-white/60">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        {t.email || <span className="text-white/60">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        {t.status || <span className="text-white/60">—</span>}
                      </td>
                      <td className={`px-3 py-2 ${consentClass}`}>
                        {consentLabel}
                      </td>
                      <td className="px-3 py-2">
                        {t.data_consent_at ? (
                          <span>{formatDateTime(t.data_consent_at)}</span>
                        ) : (
                          <span className="text-white/60">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Tiny toast */}
      {!!copied && (
        <div className="fixed bottom-4 right-4 px-3 py-2 rounded bg-white/10 border border-white/20 text-xs">
          Copied {copied} to clipboard
        </div>
      )}
    </div>
  );
}

