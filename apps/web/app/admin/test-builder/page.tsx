// apps/web/app/admin/test-builder/page.tsx
"use client";
import { useEffect, useState } from "react";

type BaseOption = { id: number; onum: number; text: string; points: number; profile_index: number; frequency: "A"|"B"|"C"|"D" };
type BaseQuestion = { id: number; qnum: number; text: string; base_options: BaseOption[] };

export default function TestBuilderPage() {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [base, setBase] = useState<BaseQuestion[]>([]);
  const [adding, setAdding] = useState(false);
  const [newQ, setNewQ] = useState<{ text: string; options: any[]; segmentation?: string }>({
    text: "",
    options: [
      { onum: 1, text: "", points: 0, profile_index: 1, frequency: "A" },
      { onum: 2, text: "", points: 0, profile_index: 2, frequency: "B" },
      { onum: 3, text: "", points: 0, profile_index: 3, frequency: "C" },
      { onum: 4, text: "", points: 0, profile_index: 4, frequency: "D" },
    ],
    segmentation: ""
  });

  async function post(url: string, body?: any) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || `POST ${url} failed (${res.status})`);
    return j;
  }
  async function get(url: string) {
    const res = await fetch(url, { cache: "no-store" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || `GET ${url} failed (${res.status})`);
    return j;
  }

  async function loadBase() {
    setLoading(true);
    try {
      const j = await get("/api/admin/tests/base/list");
      setBase(j.items || []);
    } catch (e: any) {
      setMsg(e.message || "Failed to load base questions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBase();
  }, []);

  const seed = async () => {
    setMsg("Seeding base questions…");
    try {
      const j = await post("/api/admin/tests/seed-base");
      setMsg(`Seeded ${j.count} questions ✓`);
      await loadBase();
    } catch (e: any) {
      setMsg(`Seed failed: ${e.message}`);
    }
  };

  const rephrase = async (scope: "questions"|"answers"|"both") => {
    setMsg(`Rephrasing ${scope}…`);
    try {
      const j = await post("/api/admin/tests/base/rephrase", { scope });
      setMsg(`Rephrased ✓ (${j.updated_questions} questions)`);
      await loadBase();
    } catch (e: any) {
      setMsg(`Rephrase failed: ${e.message}`);
    }
  };

  const addQuestion = async () => {
    setAdding(true);
    setMsg("");
    try {
      const j = await post("/api/admin/tests/base/add", newQ);
      setMsg(`Added question #${j.qnum} ✓`);
      setNewQ({
        text: "",
        options: [
          { onum: 1, text: "", points: 0, profile_index: 1, frequency: "A" },
          { onum: 2, text: "", points: 0, profile_index: 2, frequency: "B" },
          { onum: 3, text: "", points: 0, profile_index: 3, frequency: "C" },
          { onum: 4, text: "", points: 0, profile_index: 4, frequency: "D" },
        ],
        segmentation: ""
      });
      await loadBase();
    } catch (e: any) {
      setMsg(`Add failed: ${e.message}`);
    } finally {
      setAdding(false);
    }
  };

  const create = async (mode: "free" | "full") => {
    setMsg(`Creating ${mode} test…`);
    try {
      const j = await post("/api/admin/tests/create", { mode });
      setMsg(`Created ${mode} test ✓ → /test/${j.test_id}`);
    } catch (e: any) {
      setMsg(`Create failed: ${e.message}`);
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-6 text-white">
      <h1 className="text-2xl font-semibold">Test Builder</h1>
      <p className="text-white/70">Seed base questions, rephrase to match the client's brand, add extras for segmentation, then sign off.</p>

      <div className="mt-6 flex gap-3 flex-wrap">
        <button onClick={seed} className="px-4 py-2 rounded-xl bg-white text-black font-medium">Seed Base Questions</button>
        <button onClick={() => rephrase("questions")} className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-medium">Rephrase Questions</button>
        <button onClick={() => rephrase("answers")} className="px-4 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-600 font-medium">Rephrase Answers</button>
        <button onClick={() => rephrase("both")} className="px-4 py-2 rounded-xl bg-cyan-800 hover:bg-cyan-700 font-medium">Rephrase Both</button>
        {msg && <span className="text-white/80">{msg}</span>}
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Base Questions {loading ? "(loading…)" : `(${base.length})`}</h2>
        {base.length === 0 && !loading ? (
          <p className="text-white/70 mt-2">No base questions yet. Click “Seed Base Questions”.</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {base.map((q) => (
              <li key={q.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="font-medium">{q.qnum}. {q.text}</div>
                <ul className="mt-2 grid gap-2">
                  {q.base_options?.sort((a,b)=>a.onum-b.onum).map((o) => (
                    <li key={o.id} className="text-sm text-white/80">
                      <span className="font-mono mr-2">({o.onum})</span>
                      {o.text} — <b>{o.points}</b> pts · Freq {o.frequency} · Profile {o.profile_index}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Add Question */}
      <section className="mt-10 p-4 rounded-xl bg-white/5 border border-white/10">
        <h3 className="text-lg font-semibold">Add Additional Question (Segmentation)</h3>
        <label className="block mt-3">
          <span className="block text-sm mb-1">Question text</span>
          <input className="w-full rounded-lg bg-white text-black p-3" value={newQ.text} onChange={(e)=>setNewQ(q=>({...q, text:e.target.value}))}/>
        </label>
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          {newQ.options.map((opt, idx)=>(
            <div key={idx} className="p-3 rounded-lg bg-white/10">
              <div className="text-sm font-medium mb-2">Option {opt.onum}</div>
              <input className="w-full rounded bg-white text-black p-2 mb-2" placeholder="Answer text" value={opt.text} onChange={(e)=>{
                const v = e.target.value; setNewQ(q=>{ const arr=[...q.options]; arr[idx]={...arr[idx], text:v}; return {...q, options:arr};});
              }}/>
              <div className="grid grid-cols-3 gap-2">
                <input type="number" className="rounded bg-white text-black p-2" placeholder="Points" value={opt.points} onChange={(e)=>{
                  const v = Number(e.target.value)||0; setNewQ(q=>{ const arr=[...q.options]; arr[idx]={...arr[idx], points:v}; return {...q, options:arr};});
                }}/>
                <input type="number" className="rounded bg-white text-black p-2" placeholder="Profile #" value={opt.profile_index} onChange={(e)=>{
                  const v = Number(e.target.value)||1; setNewQ(q=>{ const arr=[...q.options]; arr[idx]={...arr[idx], profile_index:v}; return {...q, options:arr};});
                }}/>
                <select className="rounded bg-white text-black p-2" value={opt.frequency} onChange={(e)=>{
                  const v = e.target.value as "A"|"B"|"C"|"D"; setNewQ(q=>{ const arr=[...q.options]; arr[idx]={...arr[idx], frequency:v}; return {...q, options:arr};});
                }}>
                  <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                </select>
              </div>
            </div>
          ))}
        </div>
        <label className="block mt-3">
          <span className="block text-sm mb-1">Segmentation tag(s) (optional)</span>
          <input className="w-full rounded bg-white text-black p-2" placeholder="e.g. onboarding, role, seniority" value={newQ.segmentation} onChange={(e)=>setNewQ(q=>({...q, segmentation:e.target.value}))}/>
        </label>
        <div className="mt-3">
          <button onClick={addQuestion} disabled={adding} className="px-4 py-2 rounded-xl bg-white text-black font-medium disabled:opacity-60">
            {adding ? "Adding…" : "Add Question"}
          </button>
          {msg && <span className="text-white/80 ml-3">{msg}</span>}
        </div>
      </section>

      {/* Sign-off actions at bottom */}
      <div className="mt-10 flex gap-3 flex-wrap justify-end">
        <button onClick={() => create("free")} className="px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-semibold">
          Create Free Test
        </button>
        <button onClick={() => create("full")} className="px-5 py-3 rounded-xl bg-cyan-700 hover:bg-cyan-600 font-semibold">
          Create Full Test
        </button>
      </div>
    </main>
  );
}
