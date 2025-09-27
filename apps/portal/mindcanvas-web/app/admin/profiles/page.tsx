'use client';

import { useEffect, useMemo, useState } from 'react';

type Profile = {
  code: string;
  name: string;
  flow: string;
  overview: string | null;
  strengths: string[] | null;
  watchouts: string[] | null;
  tips: string[] | null;
  welcome_long: string | null;
  introduction_long: string | null;
  competencies_long: string | null;
  brand_color: string | null;
  image_url: string | null;
  updated_at?: string | null;
};

type SaveState =
  | { state: 'idle' }
  | { state: 'saving' }
  | { state: 'saved'; at: number }
  | { state: 'error'; message: string };

function arrToTextarea(a: string[] | null | undefined): string {
  return (a ?? []).join('\n');
}
function textareaToArr(s: string): string[] {
  return s
    .split('\n')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export default function ProfilesAdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [save, setSave] = useState<SaveState>({ state: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => {
      return (
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.flow ?? '').toLowerCase().includes(q)
      );
    });
  }, [profiles, query]);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/admin/profiles', { cache: 'no-store' });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? 'Failed to load profiles');
      setLoading(false);
      return;
    }
    const rows = (await res.json()) as Profile[];
    setProfiles(rows);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function update<K extends keyof Profile>(code: string, key: K, value: Profile[K]) {
    setProfiles((prev) => prev.map((p) => (p.code === code ? { ...p, [key]: value } : p)));
  }

  async function handleSave() {
    setSave({ state: 'saving' });
    setError(null);

    const res = await fetch('/api/admin/profiles', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(profiles),
    });

    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setSave({ state: 'error', message: j.error ?? 'Save failed' });
      return;
    }

    setSave({ state: 'saved', at: Date.now() });
    // Re-pull canonical rows from server
    await load();
  }

  const statusEl = (
    <div className="text-sm">
      {save.state === 'saving' && <span className="text-blue-700">Saving…</span>}
      {save.state === 'saved' && (
        <span className="text-green-700">Saved at {new Date(save.at).toLocaleTimeString()}</span>
      )}
      {save.state === 'error' && <span className="text-red-700">{save.message}</span>}
    </div>
  );

  if (loading) return <div className="p-6">Loading profiles…</div>;

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <h1 className="text-2xl font-bold">Profiles Admin</h1>
        <div className="flex items-center gap-3">
          <input
            className="w-64 border rounded px-3 py-2 text-sm"
            placeholder="Filter by code / name / flow…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            onClick={handleSave}
            disabled={save.state === 'saving'}
            className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {save.state === 'saving' ? 'Saving…' : 'Save All'}
          </button>
          {statusEl}
        </div>
      </header>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map((p) => (
          <article key={p.code} className="rounded-2xl border p-5 bg-white shadow-sm space-y-4">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {p.code} — {p.name}
                </h2>
                <p className="text-xs text-gray-500">
                  Flow: <span className="font-medium">{p.flow}</span>
                  {p.updated_at ? ` • Updated ${new Date(p.updated_at).toLocaleString()}` : null}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-medium">Brand</label>
                <input
                  type="color"
                  className="h-8 w-10 rounded"
                  value={p.brand_color ?? '#000000'}
                  onChange={(e) => update(p.code, 'brand_color', e.target.value)}
                />
              </div>
            </header>

            {/* Overview */}
            <label className="block">
              <span className="text-sm font-medium">Overview</span>
              <textarea
                className="mt-1 w-full border rounded p-2"
                rows={2}
                value={p.overview ?? ''}
                onChange={(e) => update(p.code, 'overview', e.target.value)}
              />
            </label>

            {/* Long-form sections */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="block">
                <span className="text-sm font-medium">Welcome</span>
                <textarea
                  className="mt-1 w-full border rounded p-2"
                  rows={5}
                  value={p.welcome_long ?? ''}
                  onChange={(e) => update(p.code, 'welcome_long', e.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium">Introduction</span>
                <textarea
                  className="mt-1 w-full border rounded p-2"
                  rows={5}
                  value={p.introduction_long ?? ''}
                  onChange={(e) => update(p.code, 'introduction_long', e.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium">Competencies</span>
                <textarea
                  className="mt-1 w-full border rounded p-2"
                  rows={5}
                  value={p.competencies_long ?? ''}
                  onChange={(e) => update(p.code, 'competencies_long', e.target.value)}
                />
              </label>
            </div>

            {/* Arrays: strengths / watchouts / tips */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="block">
                <span className="text-sm font-medium">
                  Strengths <span className="text-gray-500">(one per line)</span>
                </span>
                <textarea
                  className="mt-1 w-full border rounded p-2 font-mono text-xs"
                  rows={6}
                  value={arrToTextarea(p.strengths)}
                  onChange={(e) => update(p.code, 'strengths', textareaToArr(e.target.value))}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium">
                  Watch-outs <span className="text-gray-500">(one per line)</span>
                </span>
                <textarea
                  className="mt-1 w-full border rounded p-2 font-mono text-xs"
                  rows={6}
                  value={arrToTextarea(p.watchouts)}
                  onChange={(e) => update(p.code, 'watchouts', textareaToArr(e.target.value))}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium">
                  Tips / Guidance <span className="text-gray-500">(one per line)</span>
                </span>
                <textarea
                  className="mt-1 w-full border rounded p-2 font-mono text-xs"
                  rows={6}
                  value={arrToTextarea(p.tips)}
                  onChange={(e) => update(p.code, 'tips', textareaToArr(e.target.value))}
                />
              </label>
            </div>

            {/* Image URL + Preview */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4 items-start">
              <label className="block">
                <span className="text-sm font-medium">Image URL</span>
                <input
                  type="text"
                  className="mt-1 w-full border rounded p-2"
                  placeholder="/images/profiles/P1.png"
                  value={p.image_url ?? ''}
                  onChange={(e) => update(p.code, 'image_url', e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use a full URL or a path under <code>/public</code>.
                </p>
              </label>

              <div className="rounded-lg border p-2 flex items-center justify-center h-40">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image_url}
                    alt={`${p.name} preview`}
                    className="max-h-36 object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'data:image/svg+xml;utf8,' +
                        encodeURIComponent(
                          `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="140"><rect width="100%" height="100%" fill="#f5f5f5"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#777">Image not found</text></svg>`
                        );
                    }}
                  />
                ) : (
                  <div className="text-xs text-gray-500">No image set</div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
