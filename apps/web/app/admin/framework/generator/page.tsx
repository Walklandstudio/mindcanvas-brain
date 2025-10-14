'use client';

import { useEffect, useState } from 'react';

type Profile = {
  id?: string;
  name: string;
  frequency: 'A' | 'B' | 'C' | 'D';
  ordinal: number;
};

export default function FrameworkGeneratorPage() {
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasGoals, setHasGoals] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // quick probe to see if goals exist (used to enable button/help text)
        const r = await fetch('/api/onboarding', { cache: 'no-store' });
        const j = await r.json();
        setHasGoals(!!j?.onboarding?.goals && Object.keys(j.onboarding.goals).length > 0);
      } catch {
        setHasGoals(false);
      }
    })();
  }, []);

  async function generate() {
    setLoading(true);
    setError(null);
    setProfiles(null);
    try {
      const r = await fetch('/api/admin/framework/generate', { method: 'POST' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Failed to generate');
      setProfiles(j.profiles);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Framework Generator</h1>
        <a href="/admin/framework" className="mc-btn-ghost">Back to Framework</a>
      </header>

      <section className="mc-card p-6 space-y-4">
        <h2 className="text-xl font-semibold">Generate 8 Profiles from Onboarding Goals</h2>
        <p className="text-white/70">
          We’ll derive profile names, assign frequencies (A–D), set ordinals (1–8), and seed a compatibility matrix.
          If an AI key is configured, names and descriptions are enhanced automatically.
        </p>
        <div className="flex items-center gap-3">
          <button onClick={generate} disabled={loading} className="mc-btn-primary">
            {loading ? 'Generating…' : 'Generate from Goals'}
          </button>
          {hasGoals === false && (
            <span className="text-amber-300 text-sm">
              We couldn’t find onboarding goals. Complete <a className="underline" href="/onboarding/create-account">Onboarding</a> first.
            </span>
          )}
        </div>
        {error && <div className="text-red-300">{error}</div>}
      </section>

      {profiles && (
        <section className="mc-card p-6">
          <h3 className="text-lg font-semibold mb-4">Preview (8 Profiles)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {profiles.map((p) => (
              <div key={`${p.frequency}-${p.ordinal}`} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-white/60">
                  #{p.ordinal} • Frequency {p.frequency}
                </div>
                <div className="text-lg font-semibold mt-1">{p.name}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 text-white/70 text-sm">
            Compatibility matrix has also been seeded automatically.
          </div>
        </section>
      )}
    </main>
  );
}
