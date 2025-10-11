'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useOnboardingAutosave } from '../_lib/useOnboardingAutosave';

type Branding = {
  brandDesc?: string;
  background?: string; primary?: string; secondary?: string; accent?: string;
  font?: string; tone?: string; logoUrl?: string;
};

const supabase = typeof window !== 'undefined'
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  : (null as any);

async function load() {
  const r = await fetch('/api/onboarding', { cache:'no-store' });
  const j = await r.json();
  const b = (j.onboarding?.branding ?? {}) as Branding;
  return {
    brandDesc: 'Professional, modern, approachable — focused on empowerment through knowledge.',
    background: '#2d8fc4', primary: '#64bae2', secondary: '#015a8b', accent: '#1f2937',
    font: '', tone: '', logoUrl: '', ...b
  } satisfies Branding;
}

async function saveBranding(payload: Branding) {
  await fetch('/api/onboarding', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ branding: payload })
  });
}

export default function Page() {
  const [data, setData] = useState<Branding>({
    brandDesc:'', background:'#2d8fc4', primary:'#64bae2', secondary:'#015a8b', accent:'#1f2937'
  });
  const [preview, setPreview] = useState<string>('Clear, confident, and practical guidance that reflects your brand voice.');

  useEffect(()=>{ (async()=> setData(await load()))(); }, []);

  const onSave = useCallback((d: Branding)=>saveBranding(d), []);
  useOnboardingAutosave(data, onSave, 400);

  // Lightweight “AI” sample using the local rephrase endpoint
  useEffect(()=> {
    const make = async () => {
      const r = await fetch('/api/ai/rephrase', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ text: data.brandDesc || 'Clear, helpful report copy.', tone:'friendly' })
      });
      const j = await r.json();
      setPreview(j.text ?? 'Clear, helpful report copy.');
    };
    void make();
  }, [data.brandDesc]);

  async function uploadLogo(file: File) {
    const orgRes = await fetch('/api/onboarding'); // reuse GET to infer org
    const orgJson = await orgRes.json();
    const orgId: string = orgJson?.onboarding?.org_id || 'org'; // not stored on client; path still scoped

    const path = `orgs/${orgId}/logo-${Date.now()}.png`;
    const { error } = await supabase.storage.from('branding').upload(path, file, { upsert: true, contentType: file.type });
    if (error) { alert(error.message); return; }

    const { data:pub } = supabase.storage.from('branding').getPublicUrl(path);
    setData(prev => ({ ...prev, logoUrl: pub.publicUrl }));
  }

  return (
    <main className="mx-auto max-w-6xl p-6 text-white">
      <h1 className="text-2xl font-semibold mb-6">Step 3 — Branding</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <label className="block text-sm mb-1">Branding Description</label>
          <textarea rows={3} className="w-full rounded-md border px-3 py-2 bg-white text-black"
            value={data.brandDesc ?? ''} onChange={e=>setData({...data, brandDesc:e.target.value})} />

          <div className="grid grid-cols-2 gap-4 mt-4">
            {(['background','primary','secondary','accent'] as const).map(k => (
              <div key={k}>
                <label className="block text-sm mb-1 capitalize">{k}</label>
                <input type="color" className="w-full h-10 rounded-md border"
                  value={(data[k] as string) ?? '#000000'}
                  onChange={e=>setData({...data, [k]:e.target.value})}/>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm mb-1">Font family</label>
              <input className="w-full rounded-md border px-3 py-2 bg-white text-black"
                value={data.font ?? ''} onChange={e=>setData({...data, font:e.target.value})}/>
            </div>
            <div>
              <label className="block text-sm mb-1">Logo</label>
              <input type="file" accept="image/*" className="block w-full text-sm"
                onChange={e => { const f = e.target.files?.[0]; if (f) void uploadLogo(f); }}/>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm mb-1">Voice & Tone</label>
            <textarea rows={5} className="w-full rounded-md border px-3 py-2 bg-white text-black"
              value={data.tone ?? ''} onChange={e=>setData({...data, tone:e.target.value})}/>
          </div>

          <div className="mt-6 flex gap-3">
            <a className="px-4 py-2 rounded-xl border" href="/onboarding/company">Back</a>
            <a className="px-4 py-2 rounded-xl bg-white text-black" href="/onboarding/goals">Save & Next</a>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-2xl bg-[color:var(--bg-preview,#0b2a45)] p-6"
             style={{ ['--bg-preview' as any]: data.background }}>
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl" style={{ background: data.primary }} />
            <span className="text-sm text-white/70">Your Logo</span>
          </div>
          <h2 className="mt-6 text-white/80 text-sm">Report Preview</h2>
          <h3 className="mt-2 text-2xl font-semibold">Signature Profile Report</h3>
          <p className="mt-3 text-white/80">{preview}</p>

          <div className="mt-6 flex items-center gap-4 text-sm">
            <span className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full" style={{background:data.accent}}/>Accent</span>
            <span className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full" style={{background:data.primary}}/>Primary</span>
            <span className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full" style={{background:data.secondary}}/>Secondary</span>
            <span className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full" style={{background:data.background}}/>Background</span>
          </div>
          {data.logoUrl && <img src={data.logoUrl} alt="Logo" className="mt-6 max-h-16 opacity-80" />}
        </div>
      </div>
    </main>
  );
}
