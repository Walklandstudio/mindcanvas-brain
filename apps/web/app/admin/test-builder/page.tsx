// apps/web/app/admin/test-builder/page.tsx
"use client";

import { useEffect, useState } from "react";

type Answer = { id: string; text: string; ordinal: number };
type Question = { id: string; qnum: number; text: string; answers: Answer[] };

export default function TestBuilderPage() {
  const [qs, setQs] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function notify(s: string) { setToast(s); setTimeout(() => setToast(null), 2000); }

  async function load() {
    setLoading(true); setErr(null);
    try {
      const res = await fetch("/api/admin/tests/load", { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Load failed");
      setQs(j.items || []);
    } catch (e: any) {
      setErr(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function rephraseQuestion(qid: string) {
    setBusy(`q:${qid}`);
    try {
      const res = await fetch(`/api/admin/tests/rephrase/question?question_id=${qid}`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Rephrase failed");
      setQs((prev) => prev.map((q) => (q.id === qid ? { ...q, text: j.text } : q)));
      notify("Question rephrased ✓");
    } catch (e: any) {
      notify(e?.message || "Rephrase failed");
    } finally {
      setBusy(null);
    }
  }

  async function rephraseAnswer(aid: string, qid: string) {
    setBusy(`a:${aid}`);
    try {
      const res = await fetch(`/api/admin/tests/rephrase/answer?answer_id=${aid}`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Rephrase failed");
      setQs((prev) =>
        prev.map((q) =>
          q.id !== qid ? q : { ...q, answers: q.answers.map((a) => (a.id === aid ? { ...a, text: j.text } : a)) }
        )
      );
      notify("Answer rephrased ✓");
    } catch (e: any) {
      notify(e?.message || "Rephrase failed");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <main className="max-w-5xl mx-auto p-6 text-white">Loading…</main>;
  if (err) return (
    <main className="max-w-5xl mx-auto p-6 text-white">
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
        <div className="text-red-300 font-medium">Couldn’t load questions</div>
        <div className="text-red-200/90 text-sm mt-1">{err}</div>
        <div className="mt-3"><button onClick={load} className="px-3 py-2 rounded-xl bg-white/10 border border-white/15">Retry</button></div>
      </div>
    </main>
  );

  return (
    <main className="max-w-4xl mx-auto p-6 text-white">
      <h1 className="text-2xl font-semibold">Test Builder</h1>
      <p className="text-white/70">
        Rephrase each question/answer to match the client’s brand. Internal mappings (points / profiles) stay intact.
      </p>

      {qs.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-white/80">No questions yet. Click retry to seed the base set automatically.</div>
          <div className="mt-3">
            <button onClick={load} className="px-3 py-2 rounded-xl bg-white/10 border border-white/15">Retry / Seed</button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 mt-6">
          {qs.map((q) => (
            <div key={q.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="font-medium">{q.qnum}. {q.text}</div>
                <button
                  onClick={() => rephraseQuestion(q.id)}
                  disabled={busy === `q:${q.id}`}
                  className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 disabled:opacity-50 text-sm"
                >
                  {busy === `q:${q.id}` ? "Rephrasing…" : "Rephrase"}
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {q.answers.map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-4">
                    <div className="text-white/85">({a.ordinal}) {a.text}</div>
                    <button
                      onClick={() => rephraseAnswer(a.id, q.id)}
                      disabled={busy === `a:${a.id}`}
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 disabled:opacity-50 text-xs"
                    >
                      {busy === `a:${a.id}` ? "Rephrasing…" : "Rephrase"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex items-center justify-end">
        <a
          href="/admin/reports/signoff"
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500"
        >
          Proceed to Report Sign-off →
        </a>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-white/10 border border-white/15">
          {toast}
        </div>
      )}
    </main>
  );
}
