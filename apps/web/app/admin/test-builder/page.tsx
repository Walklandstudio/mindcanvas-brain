// apps/web/app/admin/test-builder/page.tsx
"use client";
import { useEffect, useState } from "react";

type BaseOption = { id: number; onum: number; text: string; points: number; profile_index: number; frequency: "A"|"B"|"C"|"D" };
type BaseQuestion = { id: number; qnum: number; text: string; base_options: BaseOption[] };

export default function TestBuilderPage() {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [base, setBase] = useState<BaseQuestion[]>([]);

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
      <p className="text-white/70">Seed base questions, preview them, then create a Free (7) or Full (15) test.</p>

      <div className="mt-6 flex gap-3 flex-wrap">
        <button onClick={seed} className="px-4 py-2 rounded-xl bg-white text-black font-medium">Seed Base Questions</button>
        <button onClick={() => create("free")} className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-medium">Create Free Test</button>
        <button onClick={() => create("full")} className="px-4 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-600 font-medium">Create Full Test</button>
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
    </main>
  );
}
