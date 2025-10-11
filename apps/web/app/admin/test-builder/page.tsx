// apps/web/app/admin/test-builder/page.tsx
"use client";
import { useEffect, useState } from "react";

type BaseOption = { id: number; onum: number; text: string };
type BaseQuestion = { id: number; qnum: number; text: string; base_options: BaseOption[] };

export default function TestBuilderPage() {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [base, setBase] = useState<BaseQuestion[]>([]);
  const [adding, setAdding] = useState(false);
  const [newQ, setNewQ] = useState<{ text: string; options: string[]; segmentation?: string }>({
    text: "",
    options: ["", "", "", ""],
    segmentation: "",
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
      const items = (j.items || []).map((q: any) => ({
        id: q.id, qnum: q.qnum, text: q.text,
        base_options: (q.base_options || []).sort((a: any, b: any) => a.onum - b.onum).map((o: any) => ({ id: o.id, onum: o.onum, text: o.text }))
      }));
      setBase(items);
    } catch (e: any) {
      setMsg(e.message || "Failed to load base questions");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadBase(); }, []);

  const seed = async () => {
    setMsg("Seeding base questions…");
    try {
      const j = await post("/api/admin/tests/seed-base");
      setMsg(`Seeded ${j.count} questions ✓`);
      await loadBase();
    } catch (e: any) { setMsg(`Seed failed: ${e.message}`); }
  };

  const rephraseQuestion = async (id: number) => {
    setMsg(`Rephrasing question #${id}…`);
    try {
      await post("/api/admin/tests/base/rephrase/question", { question_id: id });
      await loadBase();
      setMsg(`Question rephrased ✓`);
    } catch (e: any) { setMsg(`Rephrase failed: ${e.message}`); }
  };

  const rephraseOption = async (id: number) => {
    setMsg(`Rephrasing answer #${id}…`);
    try {
      await post("/api/admin/tests/base/rephrase/option", { option_id: id });
      await loadBase();
      setMsg(`Answer rephrased ✓`);
    } catch (e: any) { setMsg(`Rephrase failed: ${e.message}`); }
  };

  const addQuestion = async () => {
    setAdding(true);
    setMsg("");
    try {
      // Default mapping for new added question: keep neutral points/profile/frequency on backend
      const options = newQ.options.map((t, idx) => ({
        onum: idx + 1, text: t || `Option ${idx + 1}`,
        points: [30, 20, 10, 40][idx],          // placeholder weights (kept internal)
        profile_index: [1, 5, 7, 3][idx],       // placeholder mapping (kept internal)
        frequency: (["A","C","D","B"] as const)[idx],
      }));
      await post("/api/admin/tests/base/add", { text: newQ.text, options, segmentation: newQ.segmentation || null });
      setNewQ({ text: "", options: ["", "", "", ""], segmentation: "" });
      await loadBase();
      setMsg("Question added ✓");
    } catch (e: any) { setMsg(`Add failed: ${e.message}`); }
    finally { setAdding(false); }
  };

  const create = async (mode: "free"|"full") => {
    setMsg(`Creating ${mode} test…`);
    try {
      const j = await post("/api/admin/tests/create", { mode });
      setMsg(`Created ${mode} test ✓ → /test/${j.test_id}`);
    } catch (e: any) { setMsg(`Create failed: ${e.message}`); }
  };

  return (
    <main className="max-w-4xl mx-auto p-6 text-white">
      <h1 className="text-2xl font-semibold">Test Builder</h1>
      <p className="text-white/70">Rephrase each question/answer to fit the client’s brand. Scoring stays internal.</p>

      <div className="mt-6 flex gap-3 flex-wrap">
        <button onClick={seed} className="px-4 py-2 rounded-xl bg-white text-black font-medium">Seed Base Questions</button>
        {msg && <span className="text-white/80">{msg}</span>}
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Base Questions {loading ? "(loading…)" : `(${base.length})`}</h2>
        {base.length === 0 && !loading ? (
          <p className="text-white/70 mt-2">No base questions yet. Click “Seed Base Questions”.</p>
        ) : (
          <ol className="mt-4 space-y-4">
            {base.map((q) => (
              <li key={q.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium text-base flex-1">{q.qnum}. {q.text}</div>
                  <button onClick={() => rephraseQuestion(q.id)} className="text-xs px-2 py-1 rounded-lg bg-cyan-700 hover:bg-cyan-600">
                    Rephrase Question
                  </button>
                </div>
                <ul className="mt-3 grid gap-2">
                  {q.base_options.map((o) => (
                    <li key={o.id} className="flex items-start justify-between gap-3">
                      <div className="text-sm text-white/90 flex-1">
                        <span className="font-mono mr-2">({o.onum})</span>{o.text}
                      </div>
                      <button onClick={() => rephraseOption(o.id)} className="text-xs px-2 py-1 rounded-lg bg-white/10 border border-white/20">
                        Rephrase Answer
                      </button>
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
          {newQ.options.map((t, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-white/10">
              <div className="text-sm font-medium mb-2">Answer {idx+1}</div>
              <input className="w-full rounded bg-white text-black p-2" placeholder={`Answer ${idx+1} text`} value={t} onChange={(e)=>{
                const v=e.target.value; setNewQ(q=>{ const arr=[...q.options]; arr[idx]=v; return {...q, options:arr};});
              }}/>
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
