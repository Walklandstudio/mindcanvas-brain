'use client';

import { useState } from 'react';

export default function ImportTestPage() {
  const [json, setJson] = useState('');
  const [msg, setMsg] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setMsg('');
    try {
      const payload = JSON.parse(json);
      const res = await fetch('/api/admin/tests/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${res.status}`);
      setMsg(`Imported ✓ Profiles: ${j.counts?.profiles ?? 0}, Questions: ${j.counts?.questions ?? 0}`);
    } catch (e: any) {
      setMsg(e.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mc-bg min-h-screen text-white p-6 space-y-4">
      <h1 className="text-2xl font-bold">Import Test (JSON)</h1>
      <p className="text-white/70">Paste the test JSON and click Import.</p>
      <textarea
        className="w-full min-h-[320px] rounded-xl bg-white text-black p-3"
        placeholder='{"orgSlug":"team-puzzle","test":{...},"profiles":[...],"questions":[...]}'
        value={json}
        onChange={(e) => setJson(e.target.value)}
      />
      <div className="flex gap-3 items-center">
        <button
          className="px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-600 disabled:opacity-60"
          onClick={submit}
          disabled={busy}
        >
          {busy ? 'Importing…' : 'Import'}
        </button>
        {msg && <span className="text-sm text-white/80">{msg}</span>}
      </div>
    </div>
  );
}
