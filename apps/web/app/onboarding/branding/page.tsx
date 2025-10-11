'use client';

import { useOnboardingAutosave } from '../_lib/useOnboardingAutosave';
import { useMemo, useRef } from 'react';

type Branding = {
  brandDesc?: string;
  background?: string;
  primary?: string;
  secondary?: string;
  accent?: string;
  font?: string;
  logoUrl?: string; // filled after upload
  tone?: string;
};

const swatch = 'h-10 rounded border border-white/20 w-full';
const label  = 'block text-sm mb-1 text-white/80';
const input  = 'w-full rounded bg-white text-black px-3 py-2';

export default function BrandingPage() {
  const { data, setData } = useOnboardingAutosave<Branding>('branding', {
    brandDesc: '',
    background: '#2d8fc4',
    primary: '#64bae2',
    secondary: '#f5a623',
    accent: '#222222',
    font: '',
    logoUrl: '',
    tone: ''
  });

  const fileRef = useRef<HTMLInputElement>(null);

  const previewCopy = useMemo(() => {
    // Lightweight, non-AI preview that *looks* like a report block.
    // (AI generation can be added on a button if/when OpenAI key is set.)
    return (
      <>
        <p className="text-white/90">
          {data.brandDesc?.trim() || 'Clear, confident, and practical guidance that reflects your brand voice.'}
        </p>
        <h3 className="mt-5 text-2xl font-semibold">Signature Profile Report</h3>
        <p className="mt-3 leading-relaxed text-white/90">
          This preview adopts your colors, logo, and tone. It does not repeat your exact input verbatim,
          but shows how the report body could feel once your brand is applied.
        </p>
        <div className="mt-6 flex items-center gap-5 text-sm">
          <span className="inline-flex items-center gap-2"><i className="inline-block h-3 w-3 rounded-full" style={{background:data.accent}}/> Accent</span>
          <span className="inline-flex items-center gap-2"><i className="inline-block h-3 w-3 rounded-full" style={{background:data.primary}}/> Primary</span>
          <span className="inline-flex items-center gap-2"><i className="inline-block h-3 w-3 rounded-full" style={{background:data.secondary}}/> Secondary</span>
          <span className="inline-flex items-center gap-2"><i className="inline-block h-3 w-3 rounded-full" style={{background:data.background}}/> Background</span>
        </div>
      </>
    );
  }, [data]);

  // Upload to Supabase Storage `branding`
  async function uploadLogo(file: File) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/upload?bucket=branding&prefix=orgs', { method:'POST', body: form });
    const json = await res.json();
    if (json?.publicUrl) setData({ logoUrl: json.publicUrl });
    else alert(json?.error || 'Upload failed');
  }

  return (
    <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10 p-6">
      <section className="space-y-6">
        <div>
          <label className={label}>Branding Description</label>
          <textarea className={input} rows={3}
            value={data.brandDesc || ''}
            onChange={(e)=>setData({ brandDesc: e.target.value })}
            placeholder="Professional, modern, approachable — focused on empowerment through knowledge." />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <label className={label}>Background</label>
            <input className={swatch} type="color" value={data.background || '#2d8fc4'}
              onChange={(e)=>setData({ background: e.target.value })}/>
          </div>
          <div>
            <label className={label}>Primary</label>
            <input className={swatch} type="color" value={data.primary || '#64bae2'}
              onChange={(e)=>setData({ primary: e.target.value })}/>
          </div>
          <div>
            <label className={label}>Secondary</label>
            <input className={swatch} type="color" value={data.secondary || '#015a8b'}
              onChange={(e)=>setData({ secondary: e.target.value })}/>
          </div>
          <div>
            <label className={label}>Accent</label>
            <input className={swatch} type="color" value={data.accent || '#222222'}
              onChange={(e)=>setData({ accent: e.target.value })}/>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={label}>Font family</label>
            <input className={input} placeholder='e.g., "Inter", "Poppins"'
              value={data.font || ''} onChange={(e)=>setData({ font: e.target.value })}/>
          </div>
          <div>
            <label className={label}>Logo</label>
            <div className="flex items-center gap-3">
              <input ref={fileRef} type="file" accept="image/*"
                     onChange={(e)=>{ const f=e.target.files?.[0]; if (f) uploadLogo(f); }} />
              {!!data.logoUrl && <span className="text-white/70 truncate max-w-[220px]">{data.logoUrl}</span>}
            </div>
          </div>
        </div>

        <div>
          <label className={label}>Voice & Tone</label>
          <textarea className={input} rows={5}
            placeholder="e.g., clear, confident, practical, friendly"
            value={data.tone || ''}
            onChange={(e)=>setData({ tone: e.target.value })}/>
        </div>
      </section>

      <aside
        className="rounded-2xl p-6"
        style={{ background: data.background || '#1f2a37', color: '#fff' }}
      >
        <div className="flex items-center justify-between">
          <div className="h-10 w-10 rounded-lg" style={{ background: data.primary || '#64bae2' }} />
          <span className="text-white/80">Your Logo</span>
        </div>
        <h2 className="mt-5 text-xl font-medium text-white/80">Report Preview</h2>
        <div className="mt-4 text-white/90 leading-relaxed" style={{ fontFamily: data.font || 'inherit' }}>
          {previewCopy}
        </div>
      </aside>
    </div>
  );
}
