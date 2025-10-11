// apps/web/app/admin/test-builder/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import TestBuilderFooter from "./TestBuilderFooter";

type Answer = {
  id?: string;
  text: string;
  points: number;
  frequency: "A" | "B" | "C" | "D";
  profile_index: number; // 1..8 internal mapping
};

type Question = {
  id?: string;
  qnum: number;
  text: string;
  answers: Answer[];
};

export default function TestBuilderPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function loadBase() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tests/base", { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to load base questions");
      setQuestions(j.questions || []);
    } catch (e: any) {
      notify(e?.message || "Failed to load base questions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBase();
  }, []);

  // Rephrase one question via AI
  async function rephraseQuestion(qnum: number) {
    setBusy(`q-${qnum}`);
    try {
      const res = await fetch(`/api/admin/tests/rephrase/question?q=${qnum}`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Rephrase failed");
      await loadBase();
      notify("Question rephrased");
    } catch (e: any) {
      notify(e?.message || "Rephrase failed");
    } finally {
      setBusy(null);
    }
  }

  // Rephrase a single answer (1..4)
  async function rephraseAnswer(qnum: number, ansIdx: number) {
    setBusy(`a-${qnum}-${ansIdx}`);
    try {
      const res = await fetch(`/api/admin/tests/rephrase/answer?q=${qnum}&a=${ansIdx}`, {
        method: "POST",
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Rephrase failed");
      await loadBase();
      notify("Answer rephrased");
    } catch (e: any) {
      notify(e?.message || "Rephrase failed");
    } finally {
      setBusy(null);
    }
  }

  // Add a segmentation (custom) question
  async function addSegmentationQuestion() {
    setBusy("add-seg");
    try {
      const res = await fetch(`/api/admin/tests/add-segmentation`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Add question failed");
      await loadBase();
      notify("Segmentation question added");
    } catch (e: any) {
      notify(e?.message || "Add question failed");
    } finally {
      setBusy(null);
    }
  }

  async function createFreeTest() {
    setBusy("create-free");
    try {
      const res = await fetch(`/api/admin/tests/create/free`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Create Free Test failed");
      notify("Free Test created");
      if (j.redirect) window.location.href = j.redirect as string;
    } catch (e: any) {
      notify(e?.message || "Create Free Test failed");
    } finally {
      setBusy(null);
    }
  }

  async function createFullTest() {
    setBusy("create-full");
    try {
      const res = await fetch(`/api/admin/tests/create/full`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Create Full Test failed");
      notify("Full Test created");
      if (j.redirect) window.location.href = j.redirect as string; // ← redirect to Report Sign-off
    } catch (e: any) {
      notify(e?.message || "Create Full Test failed");
    } finally {
      setBusy(null);
    }
  }

  const ready = useMemo(() => (questions?.length || 0) >= 15, [questions]);

  return (
    <main className="max-w-6xl mx-auto p-6 text-white">
      <h1 className="text-2xl font-semibold">Test Builder</h1>
      <p className="text-white/70">
        Rephrase each question/answer to match the client’s brand. Internal mappings (points / profiles) stay intact.
      </p>

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={addSegmentationQuestion}
          disabled={busy === "add-seg" || loading}
          className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 disabled:opacity-50"
        >
          + Add Segmentation Question
        </button>
        <div className="ml-auto flex gap-3">
          <button
            onClick={createFreeTest}
            disabled={busy === "create-free" || loading || !ready}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50"
          >
            Create Free Test
          </button>
          <button
            onClick={createFullTest}
            disabled={busy === "create-full" || loading || !ready}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
          >
            Create Full Test
          </button>
        </div>
      </div>

      {/* Questions */}
      <div className="mt-6">
        {loading ? (
          <div className="text-white/60">Loading questions…</div>
        ) : !questions?.length ? (
          <div className="text-white/60">No questions yet.</div>
        ) : (
          questions.map((q) => (
            <section
              key={q.qnum}
              className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="text-base font-semibold">
                  {q.qnum}. {q.text}
                </div>
                <button
                  onClick={() => rephraseQuestion(q.qnum)}
                  disabled={busy === `q-${q.qnum}`}
                  className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 hover:bg-white/15 disabled:opacity-50 text-sm"
                >
                  Rephrase Question
                </button>
              </div>

              <ul className="mt-3 space-y-2">
                {q.answers.map((a, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-white/10 bg-white/[0.035] p-3 flex items-start justify-between gap-3"
                  >
                    <div className="text-sm">
                      <span className="text-white/60 mr-2">({i + 1})</span>
                      {a.text}
                    </div>
                    <button
                      onClick={() => rephraseAnswer(q.qnum, i + 1)}
                      disabled={busy === `a-${q.qnum}-${i + 1}`}
                      className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 hover:bg-white/15 disabled:opacity-50 text-xs"
                    >
                      Rephrase Answer
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      {/* Footer CTA to Report Sign-off */}
      <TestBuilderFooter />

      {/* toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-white/10 border border-white/15">
          {toast}
        </div>
      )}
    </main>
  );
}
