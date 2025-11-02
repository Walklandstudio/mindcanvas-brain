// apps/web/app/portal/tests/[testId]/GenerateLinkPanel.tsx
'use client';

import * as React from 'react';

type Props = {
  testId: string;
  testSlug: string;
  appOrigin?: string;
};

export default function GenerateLinkPanel({ testId, testSlug, appOrigin }: Props) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUrl, setLastUrl] = React.useState<string | null>(null);
  const [lastToken, setLastToken] = React.useState<string | null>(null);
  const [showEmbed, setShowEmbed] = React.useState(false);
  const [showCode, setShowCode] = React.useState(false);
  const [email, setEmail] = React.useState('');

  async function createLink(maxUses = 1, kind: 'full' | 'free' = 'full') {
    setBusy(true);
    setError(null);
    setLastUrl(null);
    setLastToken(null);
    try {
      // POST to the by-id route
      const res = await fetch(`/api/tests/by-id/${testId}/link`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ maxUses, kind }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setLastUrl(data.url);
      setLastToken(data.token);
      try {
        await navigator.clipboard.writeText(data.url);
      } catch {
        /* ignore */
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to create link');
    } finally {
      setBusy(false);
    }
  }

  async function sendEmailInvite() {
    if (!email) {
      setError('Enter an email first');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/portal/invites/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          testKey: testId,
          recipient: email,
          // optionally pass kind/maxUses; the server can default to 'full', 1
          kind: 'full',
          maxUses: 1,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setLastUrl(data.url || null);
      setLastToken(data.token || null);
    } catch (e: any) {
      setError(e?.message || 'Failed to send invite');
    } finally {
      setBusy(false);
    }
  }

  const origin = appOrigin && appOrigin.startsWith('http') ? appOrigin.replace(/\/+$/, '') : '';
  const embedSrc = lastToken
    ? `${origin}/t/${lastToken}`
    : `${origin || ''}/t/<TOKEN_GOES_HERE>`;

  const htmlSnippet = `<iframe src="${embedSrc}" width="100%" height="700" style="border:0;border-radius:12px;"></iframe>`;
  const jsxSnippet = `<iframe src="${embedSrc}" width="100%" height="700" style={{ border: 0, borderRadius: 12 }} />`;

  return (
    <section style={{ marginTop: 16, border: '1px solid #eee', borderRadius: 10, padding: 12 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600 }}>Create & Share</h2>
      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={busy}
          onClick={() => createLink(1, 'full')}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc' }}
        >
          {busy ? 'Creating…' : 'Create & Copy Link'}
        </button>

        <button
          type="button"
          disabled={!lastToken}
          onClick={() => setShowEmbed(true)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc', opacity: lastToken ? 1 : 0.5 }}
          title={!lastToken ? 'Create a link first' : 'Show embed snippet'}
        >
          Show Embed Snippet
        </button>

        <button
          type="button"
          disabled={!lastToken}
          onClick={() => setShowCode(true)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc', opacity: lastToken ? 1 : 0.5 }}
          title={!lastToken ? 'Create a link first' : 'Show code snippet'}
        >
          Show Code Snippet
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ fontSize: 12, color: '#666' }}>Send invite email</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="recipient@example.com"
            style={{ flex: 1, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8 }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={sendEmailInvite}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc' }}
          >
            {busy ? 'Sending…' : 'Send Email Invite'}
          </button>
        </div>
      </div>

      {error && <p style={{ marginTop: 10, color: 'crimson' }}>{error}</p>}

      {lastUrl && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 600 }}>Latest link</div>
          <a href={lastUrl} target="_blank" rel="noreferrer" className="underline" style={{ wordBreak: 'break-all' }}>
            {lastUrl}
          </a>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            Copied to clipboard (if permitted).
          </div>
        </div>
      )}

      {/* Simple "modals" rendered inline */}
      {showEmbed && (
        <div style={{ marginTop: 16, padding: 12, border: '1px solid #ddd', borderRadius: 8, background: '#fafafa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Embed snippet (HTML)</strong>
            <button onClick={() => setShowEmbed(false)} style={{ border: '1px solid #ccc', borderRadius: 6, padding: '4px 8px' }}>
              Close
            </button>
          </div>
          <textarea
            readOnly
            value={htmlSnippet}
            style={{ width: '100%', height: 120, marginTop: 8, fontFamily: 'monospace', fontSize: 12 }}
          />
        </div>
      )}

      {showCode && (
        <div style={{ marginTop: 16, padding: 12, border: '1px solid #ddd', borderRadius: 8, background: '#fafafa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Code snippet (JSX)</strong>
            <button onClick={() => setShowCode(false)} style={{ border: '1px solid #ccc', borderRadius: 6, padding: '4px 8px' }}>
              Close
            </button>
          </div>
          <textarea
            readOnly
            value={jsxSnippet}
            style={{ width: '100%', height: 120, marginTop: 8, fontFamily: 'monospace', fontSize: 12 }}
          />
        </div>
      )}
    </section>
  );
}
