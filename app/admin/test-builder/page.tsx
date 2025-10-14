// apps/web/app/admin/test-builder/page.tsx
"use client";

import { useEffect, useState } from "react";

type Answer = { id: string; ordinal: number; text: string };
type Question = { id: string; qnum: number; text: string; answers: Answer[] };

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-red-900/85 text-red-50 border border-red-700 px-3 py-2 shadow">
      {message}
    </div>
  );
}

export default function TestBuilderPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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
    const input = prompt("Rephrase this question to match the client's brand:");
    if (input === null || !input.trim()) return;
    try {
      setSaving(true);
      const res = await fetch("/api/admin/tests/rephrase/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: qId, text: input.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      await load();
    } catch (e: any) {
      setToast(e?.message || "Rephrase failed");
    } finally {
      setSaving(false);
    }
  };

  const handleRephraseA = async (qId: string, aId: string) => {
    const input = prompt("Rephrase this answer to match the client's brand:");
    if (input === null || !input.trim()) return;
    try {
      setSaving(true);
      const res = await fetch("/api/admin/tests/rephrase/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: qId, answer_id: aId, text: input.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      await load();
    } catch (e: any) {
      setToast(e?.message || "Rephrase failed");
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      alert(`Created ${mode === "free" ? "Free" : "Full"} Test`);
    } catch (e: any) {
      setToast(e?.message || "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-6 py-8">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Test Builder</h1>
          <p className="text-sm text-white/60">
            Rephrase each question/answer to match the client’s brand. Internal mappings stay intact.
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

      {loading && <div className="text-white/70">Loading…</div>}
      {error && (
        <div className="rounded-lg bg-red-900/40 border border-red-800 p-4 text-red-100 mb-6">
          <div className="font-semibold mb-1">Couldn’t load questions</div>
          <div className="text-sm">{error}</div>
          <div className="mt-3">
            <button className="rounded-md px-3 py-1 bg-white/10 hover:bg-white/15" onClick={load}>
              Retry
            </button>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          {items.length === 0 && <div className="text-white/70">No questions yet.</div>}

          {items.map((q) => (
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
          ))}
        </div>
      )}

      <div className="mt-10 flex justify-end">
        <a
          href="/admin/reports"
          className="rounded-xl px-5 py-3 bg-teal-700 hover:bg-teal-600 text-white"
        >
          Proceed to Report Sign-off →
        </a>
      </div>
    </div>
  );
}
