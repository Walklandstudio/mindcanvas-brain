'use client';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function NewTestPage() {
  const sp = useSearchParams();
  const modeParam = sp.get('mode');
  const initialMode = modeParam === 'free' || modeParam === 'full' ? modeParam : 'full';

  const [name, setName] = useState('My First Test');
  const [mode, setMode] = useState<'free' | 'full'>(initialMode as 'free' | 'full');
  const [creating, setCreating] = useState(false);
  const [share, setShare] = useState<{ token: string; shareUrl: string } | null>(null);

  async function create() {
    setCreating(true);
    try {
      const res = await fetch('/api/tests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mode }),
      });
      const j = await res.json();
      if (!res.ok) {
        alert(j.error || 'Create failed');
        return;
      }
      setShare({ token: j.token, shareUrl: j.shareUrl });
    } finally {
      setCreating(false);
    }
  }

  const help = useMemo(
    () =>
      mode === 'free'
        ? 'Free Test: 5–7 curated questions → frequency-only result.'
        : 'Full Test: 15 questions → full profile and report.',
    [mode]
  );

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Create a Test</h1>
      <p className="text-sm text-gray-500 mt-1">Generate a shareable link for takers.</p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-sm">Test name</label>
          <input className="w-full border rounded-md px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">Mode</label>
          <div className="mt-2 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="mode" checked={mode === 'free'} onChange={() => setMode('free')} /> Free
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="mode" checked={mode === 'full'} onChange={() => setMode('full')} /> Full
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">{help}</p>
        </div>
        <button onClick={create} disabled={creating} className="px-4 py-2 rounded-xl bg-black text-white">
          {creating ? 'Creating…' : 'Create Test & Link'}
        </button>

        {share && (
          <div className="mt-6 rounded-xl border p-4">
            <div className="text-sm text-gray-600">Share this link with takers:</div>
            <div className="mt-2 font-mono text-sm break-all">{share.shareUrl}</div>
            <div className="mt-4 flex gap-3">
              <a className="px-3 py-2 rounded-xl border" href={share.shareUrl} target="_blank">
                Open Test
              </a>
              <a className="px-3 py-2 rounded-xl border" href={`${share.shareUrl}/result`} target="_blank">
                View Result
              </a>
              <a className="px-3 py-2 rounded-xl border" href={`${share.shareUrl}/report`} target="_blank">
                View Report
              </a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
