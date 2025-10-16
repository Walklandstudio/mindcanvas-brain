"use client";

import { useState } from "react";

type QA = { q: string; options: string[]; correct?: number | null };

export default function TestBuilderPage() {
  const [title, setTitle] = useState("Profile Test");
  const [qas, setQas] = useState<QA[]>([{ q: "", options: ["", "", "", ""], correct: null }]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [testId, setTestId] = useState<string | null>(null);

  function setQ(i: number, v: string) {
    setQas((arr) => { const next = [...arr]; next[i] = { ...next[i], q: v }; return next; });
  }
  function setOpt(i: number, j: number, v: string) {
    setQas((arr) => { const next = [...arr]; const opts = [...(next[i].options || [])]; opts[j] = v; next[i] = { ...next[i], options: opts }; return next; });
  }
  function addQA() { setQas((arr) => [...arr, { q: "", options: ["", "", "", ""], correct: null }]); }
  function removeQA(i: number) { setQas((arr) => arr.filter((_, idx) => idx !== i)); }

  async function rephrase() {
    try {
      setLoading(true); setErr("");
      const gRes = await fetch("/api/onboarding/get?step=goals", { cache: "no-store" });
      const goals = (await gRes.json().catch(() => ({})))?.data || {};
      const res = await fetch("/api/admin/tests/rephrase", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goals, items: qas }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Rephrase failed");
      setQas(j.items || qas);
    } catch (e: any) {
      setErr(e?.message || "Rephrase failed");
    } finally { setLoading(false); }
  }

  async function save() {
    try {
      setLoading(true); setErr("");
      let raw = (typeof window !== "undefined" && localStorage.getItem("mc_org_id")) || "";
      const orgId = raw && raw !== "null" && raw !== "undefined" ? raw : null;
      const res = await fetch("/api/admin/tests/save", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId, orgId, title, questions: qas }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Save failed");
      setTestId(j.id);
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally { setLoading(false); }
  }

  async function deploy() {
    try {
      setLoading(true); setErr("");
      const res = await fetch("/api/admin/tests/deploy", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId, title }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Deploy failed");
      window.location.href = `/t/${j.slug}`;
    } catch (e: any) {
      setErr(e?.message || "Deploy failed");
    } finally { setLoading(false); }
  }

  return (
    <main className="max-w-4xl mx-auto p-8 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Test Builder</h1>
          <p className="text-white/60">Rephrase with AI based on onboarding goals. Save and deploy a public test.</p>
        </div>
        <div className="text-white/60 text-sm">{testId ? `Draft • ${testId.slice(0,8)}…` : "New Draft"}</div>
      </div>

      <div className="mt-6 grid gap-4">
        <label className="block">
          <span className="block text-sm text-white/60">Test Title</span>
          <input className="w-full rounded bg-white text-black p-3" value={title} onChange={(e)=>setTitle(e.target.value)} />
        </label>

        {err && <div className="p-3 rounded-lg bg-red-500/20 border border-red-400/40 text-red-100 text-sm">{err}</div>}

        <div className="grid gap-4">
          {qas.map((qa, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/60">Question {i+1}</div>
                <button onClick={()=>removeQA(i)} className="text-white/60 hover:text-white">Remove</button>
              </div>
              <textarea
                className="w-full mt-2 p-3 rounded bg-white text-black"
                rows={2}
                placeholder="Question…"
                value={qa.q}
                onChange={(e)=>setQ(i, e.target.value)}
              />
              <div className="grid sm:grid-cols-2 gap-2 mt-3">
                {Array.from({length:4}).map((_, j) => (
                  <input
                    key={j}
                    className="w-full p-3 rounded bg-white text-black"
                    placeholder={`Option ${j+1}`}
                    value={qa.options?.[j] ?? ""}
                    onChange={(e)=>setOpt(i, j, e.target.value)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 mt-2">
          <button onClick={addQA} className="px-4 py-2 rounded-xl bg-white/10 border border-white/20">Add Question</button>
          <button onClick={rephrase} disabled={loading} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-medium disabled:opacity-60">
            {loading ? "Rephrasing…" : "Rephrase with AI"}
          </button>
          <button onClick={save} disabled={loading} className="px-4 py-2 rounded-xl bg-white text-black font-medium disabled:opacity-60">
            {loading ? "Saving…" : "Save Draft"}
          </button>
          <button onClick={deploy} disabled={loading || !testId} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-medium disabled:opacity-60">
            {loading ? "Deploying…" : "Deploy"}
          </button>
        </div>
      </div>
    </main>
  );
}

