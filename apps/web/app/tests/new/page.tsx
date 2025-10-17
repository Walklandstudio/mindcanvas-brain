'use client';
import { useEffect, useMemo, useState } from 'react';

type Q = { question_no:number; prompt:string; options:{label:string; code:'A'|'B'|'C'|'D'}[] };

export default function NewTest() {
  const [qs, setQs] = useState<Q[]>([]);
  const [mode, setMode] = useState<'free'|'full'>('full');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { (async()=>{
    const r = await fetch('/api/admin/questions/apply', { method:'POST' }); /* no-op ensures base exist */
    // load current org_questions
    const res = await fetch('/api/admin/questions'); // if you have one; fallback: create tiny GET
  })(); }, []);

  // Minimal GET fallback if you don’t have one:
  useEffect(() => { (async()=>{
    const r = await fetch('/api/admin/questions'); // implement this to return { questions }
    if (r.ok) { const j = await r.json(); setQs(j.questions ?? []); }
  })(); }, []);

  const suggestedFree = useMemo(()=> {
    // pick 6 balanced across A/B/C/D
    const groups: Record<string,Q[]> = {A:[],B:[],C:[],D:[]};
    qs.forEach(q=> q.options.forEach(o=>{ if(o.code && !groups[o.code].find(g=>g.question_no===q.question_no)) groups[o.code].push(q); }));
    const pick=(arr:Q[],n:number)=>arr.slice(0,n);
    return Array.from(new Set([
      ...pick(groups.A,2), ...pick(groups.B,2), ...pick(groups.C,1), ...pick(groups.D,1)
    ].map(q=>q.question_no)));
  }, [qs]);

  async function rephrase(i:number, field:'prompt'|'option', optionIndex?:number) {
    const body = field==='prompt'
      ? { text: qs[i].prompt, tone:'friendly' }
      : { text: qs[i].options![optionIndex!].label, tone:'friendly' };
    const r = await fetch('/api/ai/rephrase', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const j = await r.json();
    setQs(prev=>{
      const copy=[...prev];
      if(field==='prompt') copy[i]={...copy[i], prompt:j.text};
      else {
        const opts=[...copy[i].options]; opts[optionIndex!]={...opts[optionIndex!], label:j.text}; copy[i]={...copy[i], options:opts};
      }
      return copy;
    });
  }

  async function publish() {
    setSaving(true);
    try {
      const question_ids = mode==='full' ? qs.map(q=>q.question_no) : suggestedFree;
      const r = await fetch('/api/admin/tests', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name: name || (mode==='free'?'Signature Free Test':'Signature Full Test'), mode, question_ids })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error||'publish_failed');
      location.href = '/tests'; // go back to list
    } catch(e:any){ alert(e?.message||'Failed'); }
    finally{ setSaving(false); }
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Create Test</h1>
      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="rounded-md border border-white/10 bg-white/5 px-3 py-2 md:col-span-2"
                 value={name} onChange={e=>setName(e.target.value)} placeholder="Test name" />
          <select className="rounded-md border border-white/10 bg-white/5 px-3 py-2"
                  value={mode} onChange={e=>setMode(e.target.value as any)}>
            <option value="free">Free (5–7)</option>
            <option value="full">Full (15)</option>
          </select>
        </div>

        <div className="text-sm text-slate-300">Base questions (weights are hidden from takers):</div>
        <div className="space-y-4">
          {qs.map((q,i)=>(
            <div key={q.question_no} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-400">Q{q.question_no}</div>
                <button onClick={()=>rephrase(i,'prompt')}
                        className="text-xs underline">Rephrase</button>
              </div>
              <textarea className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
                        rows={2} value={q.prompt}
                        onChange={e=>setQs(prev=>prev.map((x,idx)=>idx===i?{...x, prompt:e.target.value}:x))}
              />
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                {q.options.map((o,oi)=>(
                  <div key={oi} className="flex items-center gap-2">
                    <input className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
                           value={o.label}
                           onChange={e=>{
                             const text=e.target.value;
                             setQs(prev=>{
                               const copy=[...prev]; const opts=[...copy[i].options]; opts[oi]={...opts[oi], label:text}; copy[i]={...copy[i], options:opts}; return copy;
                             });
                           }}
                    />
                    <button onClick={()=>rephrase(i,'option',oi)} className="text-xs underline">Rephrase</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={publish} disabled={saving}
            className="rounded-2xl px-4 py-2 text-sm"
            style={{ background:'linear-gradient(135deg, var(--mc-c1), var(--mc-c2) 60%, var(--mc-c3))' }}
          >
            {saving?'Publishing…':'Publish Test'}
          </button>
          {mode==='free' && (
            <span className="text-xs text-slate-400">Suggested free subset: {suggestedFree.join(', ')}</span>
          )}
        </div>
      </div>
    </main>
  );
}
