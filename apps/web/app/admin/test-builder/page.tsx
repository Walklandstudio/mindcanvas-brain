// apps/web/app/admin/test-builder/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Answer = { id: string; ordinal: number; text: string };
type Question = { id: string; qnum: number; text: string; answers: Answer[] };

export default function TestBuilderPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Segmentation modal state
  const [segOpen, setSegOpen] = useState(false);
  const [segQuestion, setSegQuestion] = useState("");
  const [segOptions, setSegOptions] = useState<string[]>(["", ""]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tests/load", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setItems(data.items || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRephraseQ = async (qId: string) => {
    try {
      const input = prompt("Rephrase this question to match the client's brand:");
      if (!input) return;
      setSaving(true);
      const res = await fetch("/api/admin/tests/rephrase/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: qId, text: input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Rephrase failed");
      await load();
    } catch (e: any) {
      alert(e?.message || "Rephrase failed");
    } finally {
      setSaving(false);
    }
  };

  const handleRephraseA = async (qId: string, aId: string) => {
    try {
      const input = prompt("Rephrase this answer to match the client's brand:");
      if (!input) return;
      setSaving(true);
      const res = await fetch("/api/admin/tests/rephrase/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: qId, answer_id: aId, text: input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Rephrase failed");
      await load();
    } catch (e: any) {
      alert(e?.message || "Rephrase failed");
    } finally {
      setSaving(false);
    }
  };

  const createTest = async (mode: "free" | "full") => {
    try {
      setSaving(true);
      const res = await fetch("/api/admin/tests/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Create failed");
      alert(`Created ${mode === "free" ? "Free" : "Full"} Test`);
    } catch (e: any) {
      alert(e?.message || "Create failed");
    } finally {
      setSaving(false);
    }
  };

  // ---------- Segmentation Modal handlers ----------
  const addOption = () => setSegOptions((arr) => [...arr, ""]);
  const removeOption = (idx: number) => setSegOptions((arr) => arr.filter((_, i) => i !== idx));
  const updateOption = (idx: number, val: string) =>
    setSegOptions((arr) => arr.map((v, i) => (i === idx ? val : v)));

  const canSaveSeg = useMemo(() => {
    if (!segQuestion.trim()) return false;
    const options = segOptions.map((o) => o.trim()).filter(Boolean);
    return options.length >= 2 && options.length <= 6;
  }, [segQuestion, segOptions]);

  const saveSegmentation = async () => {
    try {
      if (!canSaveSeg) return;
      setSaving(true);
      const options = segOptions.map((o) => o.trim()).filter(Boolean);
      const res = await fetch("/api/admin/tests/segment/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: segQuestion.trim(), options }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      // Reset form
      setSegQuestion("");
      setSegOptions(["", ""]);
      setSegOpen(false);
      await load();
    } catch (e: any) {
      alert(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Test Builder</h1>
          <p className="text-sm text-white/60">
            Rephrase each question/answer to match the client’s brand. Internal mappings (points / profiles) stay intact.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => createTest("free")}
            className="rounded-xl px-4 py-2 bg-sky-700 hover:bg-sky-600 text-white"
            disabled={saving}
          >
            Create Free Test
          </button>
          <button
            onClick={() => createTest("full")}
            className="rounded-xl px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white"
            disabled={saving}
          >
            Create Full Test
          </button>
        </div>
      </div>

      <div className="mb-4">
        <button
          onClick={() => setSegOpen(true)}
          className="rounded-lg px-4 py-2 bg-white/10 hover:bg-white/15 text-white"
        >
          + Add Segmentation Question
        </button>
      </div>

      {loading && <div className="text-white/70">Loading…</div>}
      {error && (
        <div className="rounded-lg bg-red-900/40 border border-red-800 p-4 text-red-100 mb-6">
          <div className="font-semibold mb-1">Couldn’t load questions</div>
          <div className="text-sm">{error}</div>
          <div className="mt-3">
            <button
              className="rounded-md px-3 py-1 bg-white/10 hover:bg-white/15"
              onClick={load}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          {items.length === 0 && (
            <div className="text-white/70">No questions yet.</div>
          )}

          {items.map((q) => {
            return (
              <div key={q.id} className="rounded-2xl bg-white/5 border border-white/10 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-semibold">
                    {q.qnum}. {q.text}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-md px-3 py-1 bg-white/10 hover:bg-white/15 text-sm"
                      onClick={() => handleRephraseQ(q.id)}
                      disabled={saving}
                    >
                      Rephrase Question
                    </button>
                  </div>
                </div>

                <ol className="list-decimal ml-6 space-y-2">
                  {q.answers?.map((a) => (
                    <li key={a.id} className="flex items-center justify-between">
                      <div>{a.text}</div>
                      <button
                        className="rounded-md px-3 py-1 bg-white/10 hover:bg-white/15 text-xs"
                        onClick={() => handleRephraseA(q.id, a.id)}
                        disabled={saving}
                      >
                        Rephrase Answer
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      )}

      {/* Segmentation Modal */}
      {segOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => !saving && setSegOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-zinc-900 border border-white/10 p-5">
            <div className="text-lg font-semibold mb-2">Add Segmentation Question</div>
            <label className="block text-sm mb-1 text-white/90">Question</label>
            <input
              className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 mb-4"
              value={segQuestion}
              onChange={(e) => setSegQuestion(e.target.value)}
              placeholder="E.g., Which department are you in?"
            />

            <div className="mb-2 text-sm text-white/90">Options (2–6)</div>
            <div className="space-y-2">
              {segOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className="flex-1 rounded-lg bg-black/40 border border-white/10 px-3 py-2"
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                  />
                  {segOptions.length > 2 && (
                    <button
                      className="rounded-md px-2 py-2 bg-white/10 hover:bg-white/15 text-xs"
                      onClick={() => removeOption(i)}
                      disabled={saving}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-4">
              <button
                className="rounded-md px-3 py-2 bg-white/10 hover:bg-white/15"
                onClick={addOption}
                disabled={saving || segOptions.length >= 6}
              >
                + Add Option
              </button>

              <div className="flex gap-2">
                <button
                  className="rounded-md px-4 py-2 bg-white/10 hover:bg-white/15"
                  onClick={() => setSegOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className={`rounded-md px-4 py-2 ${canSaveSeg ? "bg-sky-700 hover:bg-sky-600 text-white" : "bg-white/10 text-white/40"}`}
                  onClick={saveSegmentation}
                  disabled={!canSaveSeg || saving}
                >
                  Save Question
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
