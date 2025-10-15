'use client';

import { useEffect, useMemo, useState } from 'react';

type Profile = {
  id: string;
  name: string;
  frequency: 'A' | 'B' | 'C' | 'D';
  image_url: string | null;
  ordinal: number | null;
};

function Toast({ text, type }: { text: string; type: 'success' | 'error' }) {
  return (
    <div
      className={[
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-2 shadow-lg',
        type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white',
      ].join(' ')}
    >
      {text}
    </div>
  );
}

export default function FrameworkClient() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [freqNames, setFreqNames] = useState<Record<'A'|'B'|'C'|'D', string> | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success'|'error' } | null>(null);

  async function load() {
    const r = await fetch('/api/framework/get', { credentials: 'include' }).catch(() => null);
    const j = await r?.json().catch(() => null);
    setProfiles(j?.profiles ?? []);
    setFreqNames(j?.frequency_meta ?? null);
  }

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const by: Record<'A'|'B'|'C'|'D', Profile[]> = { A: [], B: [], C: [], D: [] };
    for (const p of profiles) by[p.frequency].push(p);
    (Object.keys(by) as Array<keyof typeof by>).forEach(k => by[k].sort((a,b)=>(a.ordinal??0)-(b.ordinal??0)));
    return by;
  }, [profiles]);

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Framework</h2>
          <p className="text-white/60 text-sm">
            {profiles.length ? 'Edit profile names and images.' : 'Preparing a default framework for your org…'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['A','B','C','D'] as const).map(code => (
            <div key={code} className="space-y-3">
              <div className="text-sm font-semibold text-white/90">
                {code} — {freqNames?.[code] ?? code}
              </div>
              <div className="grid gap-3">
                {(grouped[code] ?? []).map(p => (
                  <div key={p.id} className="mc-card p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {p.image_url ? <img src={p.image_url} alt={p.name} className="object-cover h-12 w-12" /> : <span className="text-white/40 text-xs">no image</span>}
                      </div>
                      <div className="font-medium">{p.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {toast && <Toast text={toast.text} type={toast.type} />}
    </>
  );
}
