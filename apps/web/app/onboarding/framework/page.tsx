'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type Framework = {
  frequencies: 'A,B,C,D' | 'A,B,C';
  profiles_count: number;
  notes?: string | null;
};

const disabledStyle = 'opacity-40 cursor-not-allowed';
const tile = 'rounded-lg border p-3';

export default function FrameworkPage() {
  const router = useRouter();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [data, setData] = useState<Framework>({
    frequencies: 'A,B,C,D',
    profiles_count: 8,
    notes: ''
  });

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return router.replace('/login');
      const token = sess.session.access_token;

      const res = await fetch('/api/onboarding/framework', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const j = await res.json();
      if (j?.ok && j.data) {
        setData({
          frequencies: (j.data.frequencies as 'A,B,C,D' | 'A,B,C') ?? 'A,B,C,D',
          profiles_count: Number(j.data.profiles_count ?? 8),
          notes: j.data.notes ?? ''
        });
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const freqOptions = [
    { value: 'A,B,C,D' as const, label: '4 Frequencies (A–D)', available: true, help: 'Available' },
    { value: 'A,B,C' as const,   label: '3 Frequencies (A–C)', available: false, help: 'Coming soon' }
  ];

  const profileOptions = [
    { value: 8,  label: '8 Profiles',  available: true,  help: 'Available' },
    { value: 6,  label: '6 Profiles',  available: false, help: 'Coming soon' },
    { value: 9,  label: '9 Profiles',  available: false, help: 'Coming soon' },
    { value: 12, label: '12 Profiles', available: false, help: 'Coming soon' }
  ];

  const diagram = useMemo(() => {
    // Simple preview: render N profile tiles with A-D cycling
    const letters = data.frequencies.split(','); // ['A','B','C','D'] or ['A','B','C']
    return Array.from({ length: data.profiles_count }, (_, i) => ({
      index: i + 1,
      freq: letters[i % letters.length]
    }));
  }, [data.frequencies, data.profiles_count]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        router.replace('/login');
        throw new Error('Not authenticated');
      }
      const token = sess.session.access_token;

      const res = await fetch('/api/onboarding/framework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'save failed');
      setMsg('✅ Saved');
    } catch (err: any) {
      setMsg('❌ ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-4xl p-8 space-y-8">
      <h1 className="text-2xl font-semibold">Framework</h1>
      <p className="text-sm text-gray-600">
        Choose how your Signature Profiling framework is structured. You can start with the available options now.
        Other configurations will be enabled soon.
      </p>

      <form onSubmit={onSave} className="space-y-6">
        {/* Frequencies */}
        <section className="space-y-3">
          <h2 className="font-medium">Frequencies</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {freqOptions.map(opt => (
              <label
                key={opt.value}
                className={`${tile} flex items-start gap-3 ${!opt.available ? disabledStyle : ''}`}
                title={!opt.available ? 'Coming soon' : undefined}
              >
                <input
                  type="radio"
                  name="freq"
                  className="mt-1"
                  disabled={!opt.available}
                  checked={data.frequencies === opt.value}
                  onChange={() => setData(d => ({ ...d, frequencies: opt.value }))}
                />
                <div>
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-xs text-gray-500">{opt.help}</div>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Profiles */}
        <section className="space-y-3">
          <h2 className="font-medium">Profiles</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {profileOptions.map(opt => (
              <label
                key={opt.value}
                className={`${tile} flex items-start gap-3 ${!opt.available ? disabledStyle : ''}`}
                title={!opt.available ? 'Coming soon' : undefined}
              >
                <input
                  type="radio"
                  name="profiles"
                  className="mt-1"
                  disabled={!opt.available}
                  checked={data.profiles_count === opt.value}
                  onChange={() => setData(d => ({ ...d, profiles_count: opt.value }))}
                />
                <div>
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-xs text-gray-500">{opt.help}</div>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Diagram */}
        <section className="space-y-3">
          <h2 className="font-medium">Preview Diagram</h2>
          <div className="rounded-lg border p-4 bg-white">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
              {diagram.map(d => (
                <div key={d.index} className="rounded-md border p-2 text-center text-sm">
                  <div className="font-semibold">P{d.index}</div>
                  <div className="text-gray-600">Freq {d.freq}</div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-500">
            This simple diagram shows {data.profiles_count} profiles with the selected frequency pattern cycling across them.
          </p>
        </section>

        <div className="flex items-center gap-3">
          <button
            disabled={saving}
            className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {msg && <span className="text-sm">{msg}</span>}
          <a href="/onboarding/branding" className="text-sm underline ml-auto">← Back to Branding</a>
          <a href="/onboarding/report-builder" className="text-sm underline">Continue to Report Builder →</a>
        </div>
      </form>
    </main>
  );
}
