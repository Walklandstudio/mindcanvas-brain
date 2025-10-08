'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type Prof = { key: string; name: string };
type Pair = { a_key: string; b_key: string; score: number };

function canon(a: string, b: string): [string, string] {
  return a <= b ? [a, b] : [b, a];
}

export default function CompatAdminPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();
  const [profiles, setProfiles] = useState<Prof[]>([]);
  const [pairs, setPairs] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  async function token(): Promise<string> {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.replace('/login');
      throw new Error('no session');
    }
    return data.session.access_token;
  }

  useEffect(() => {
    (async () => {
      const tkn = await token();
      const r = await fetch('/api/admin/compatibility', {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      const j: {
        ok: boolean;
        data?: { profiles: Prof[]; pairs: Pair[] };
        error?: string;
      } = await r.json();

      if (j?.ok) {
        setProfiles(j.data?.profiles ?? []);
        const map: Record<string, number> = {};
        for (const p of (j.data?.pairs ?? [] as Pair[])) {
          const key = `${p.a_key}|${p.b_key}`;
          map[key] = p.score;
        }
        setPairs(map);
      }
      setLoading(false);
    })().catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const keys = useMemo<string[]>(() => profiles.map((p: Prof) => p.key), [profiles]);
  const names = useMemo<Record<string, string>>(
    () => Object.fromEntries(profiles.map((p: Prof) => [p.key, p.name])) as Record<string, string>,
    [profiles]
  );

  function getScore(a: string, b: string): number | '' {
    if (a === b) return '' as const; // blank on diagonal
    const [ak, bk] = canon(a, b);
    const key = `${ak}|${bk}`;
    return pairs[key] ?? 0;
  }

  function setScore(a: string, b: string, val: number) {
    const [ak, bk] = canon(a, b);
    const key = `${ak}|${bk}`;
    const n = Math.max(-2, Math.min(2, Math.round(Number(val))));
    setPairs({ ...pairs, [key]: n });
  }

  async function save() {
    setMsg('');
    const tkn = await token();
    const updates = Object.entries(pairs).map(([k, v]) => {
      const [a_key, b_key] = k.split('|');
      return { a_key, b_key, score: Number(v) || 0 };
    });
    const r = await fetch('/api/admin/compatibility', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tkn}`,
      },
      body: JSON.stringify({ updates }),
    });
    const j = await r.json();
    setMsg(j?.ok ? '✅ Saved' : '❌ ' + (j?.error || 'failed'));
  }

  if (loading) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-6xl p-8 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Compatibility Matrix</h1>
        <nav className="flex gap-3 text-sm">
          <a className="underline" href="/dashboard">Dashboard</a>
          <a className="underline" href="/admin/profiles">Profiles</a>
          <a className="underline" href="/admin/reports">Report Content</a>
        </nav>
      </header>

      {keys.length !== 8 ? (
        <div className="rounded-lg border bg-white p-4">
          Seed or edit profiles first on the <a className="underline" href="/admin/profiles">Profiles</a> page.
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-white overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left">Profile</th>
                  {keys.map((k: string) => (
                    <th key={k} className="px-3 py-2 text-center">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {keys.map((rowK: string) => (
                  <tr key={rowK}>
                    <td className="px-3 py-2 font-medium">
                      {rowK} · <span className="text-gray-500">{names[rowK]}</span>
                    </td>
                    {keys.map((colK: string) => {
                      if (rowK === colK) {
                        return (
                          <td key={colK} className="px-3 py-2 text-center text-gray-400">—</td>
                        );
                      }
                      const val = getScore(rowK, colK);
                      return (
                        <td key={colK} className="px-3 py-2 text-center">
                          <input
                            type="number"
                            className="w-16 rounded-md border px-2 py-1 text-center"
                            min={-2}
                            max={2}
                            value={val as number}
                            onChange={(e) => setScore(rowK, colK, Number(e.target.value))}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={save} className="rounded-md border px-4 py-2">Save</button>
            <span className="text-xs text-gray-500">Scale: -2 (low) … 0 (neutral) … +2 (high)</span>
          </div>
        </>
      )}

      {msg && <div className="text-sm">{msg}</div>}
    </main>
  );
}
