'use client';

import { useState } from 'react';

export default function ImportTestPage() {
  const [orgSlug, setOrgSlug] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState<string>('');

  async function doImport() {
    setBusy(true); setErr(''); setOut(null);
    try {
      let parsed: any = null;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        throw new Error('The JSON is invalid. Please fix and try again.');
      }

      const r = await fetch('/api/admin/tests/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_slug: orgSlug.trim(), payload: parsed }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
      setOut(j);
    } catch (e: any) {
      setErr(e?.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mc-bg min-h-screen text-white p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Admin · Import Test</h1>
      <p className="text-white/70">
        Paste the test JSON (frequencies, profiles, questions, thresholds) and enter the target organization slug.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="block md:col-span-1">
          <span className="block text-sm mb-1 text-white/80">Organization Slug</span>
          <input
            className="w-full rounded-xl bg-white text-black p-3"
            placeholder="e.g. team-puzzle"
            value={orgSlug}
            onChange={(e) => setOrgSlug(e.target.value)}
          />
        </label>

        <div className="md:col-span-2">
          <span className="block text-sm mb-1 text-white/80">Test JSON</span>
          <textarea
            className="w-full min-h-[360px] rounded-xl bg-white text-black p-3 font-mono text-sm"
            placeholder='{
  "frequencies": [...],
  "profiles": [...],
  "questions": [...],
  "thresholds": [...]
}'
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          className="px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-600 disabled:opacity-60"
          onClick={doImport}
          disabled={busy || !orgSlug || !jsonText}
        >
          {busy ? 'Importing…' : 'Import'}
        </button>
        <button
          className="px-4 py-2 rounded-xl bg-white/10 border border-white/20"
          onClick={() => { setJsonText(''); setOrgSlug(''); setErr(''); setOut(null); }}
          disabled={busy}
        >
          Reset
        </button>
      </div>

      {err && (
        <div className="rounded-xl bg-red-500/15 border border-red-400/40 p-4">{err}</div>
      )}

      {out && (
        <details open className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <summary className="cursor-pointer">Import Result</summary>
          <pre className="mt-3 text-xs whitespace-pre-wrap">
            {JSON.stringify(out, null, 2)}
          </pre>
        </details>
      )}
    </main>
  );
}
