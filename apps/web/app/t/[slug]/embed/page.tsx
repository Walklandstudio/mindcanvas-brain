"use client";

import { useEffect, useState } from "react";

type A = { id: string; text: string; ordinal: number; points?: number };
type Q = { id: string; qnum: number | null; text: string; answers: A[] };

export default function PublicTestEmbed({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [title, setTitle] = useState<string>("Profile Test");
  const [items, setItems] = useState<Q[]>([]);

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

  if (loading) return <div style={{ color: "white", padding: 16 }}>Loading…</div>;
  if (err) return <div style={{ color: "white", padding: 16 }}>Error: {err}</div>;

  return (
    <div className="p-4 text-white">
      <h1 className="text-xl font-semibold mb-4">{title}</h1>
      <div className="space-y-6">
        {items.map((q, idx) => (
          <div key={q.id} className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="font-semibold mb-3">{(q.qnum ?? idx + 1)}. {q.text}</div>
            <ol className="list-disc ml-5 space-y-1">
              {q.answers.map((a) => (
                <li key={a.id}>{a.text}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
