"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";

type A = { id: string; text: string; ordinal: number; points?: number };
type Q = { id: string; qnum: number | null; text: string; answers: A[] };

export default async function Page(props: any) {
  // ✅ Handle both sync and async params (Next 15 compatibility)
  const { slug } = (await props?.params) ?? {};

  return <PublicTestPage slug={slug} />;
}

/* -------------------- Public Test Runner -------------------- */
function PublicTestPage({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [title, setTitle] = useState<string>("Profile Test");
  const [items, setItems] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // question_id → answer_id

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(`/api/tests/${slug}/load`, { cache: "no-store" });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
        setTitle(j.title || "Profile Test");
        setItems(j.items || []);
      } catch (e: any) {
        setErr(e?.message || "Failed to load test");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  async function submit() {
    // TODO: connect to /api/tests/[slug]/submit when ready
    alert("Submission endpoint not connected yet — wire when ready.");
  }

  if (loading)
    return (
      <main className="max-w-3xl mx-auto p-6 text-white">
        <p>Loading…</p>
      </main>
    );
  if (err)
    return (
      <main className="max-w-3xl mx-auto p-6 text-white">
        <p className="text-red-400">Error: {err}</p>
      </main>
    );

  return (
    <main className="max-w-3xl mx-auto p-6 text-white">
      <h1 className="text-2xl font-semibold mb-4">{title}</h1>

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {items.map((q, idx) => (
          <div
            key={q.id}
            className="rounded-2xl bg-white/5 border border-white/10 p-5"
          >
            <div className="font-semibold mb-3">
              {(q.qnum ?? idx + 1)}. {q.text}
            </div>
            <div className="grid gap-2">
              {q.answers.map((a) => (
                <label
                  key={a.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={a.id}
                    className="accent-cyan-500"
                    onChange={() =>
                      setAnswers((s) => ({ ...s, [q.id]: a.id }))
                    }
                  />
                  <span>{a.text}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-6 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
          >
            Submit Test →
          </button>
        </div>
      </form>
    </main>
  );
}
