"use client";
import { useEffect, useState } from "react";

type Q = { id: string; order_index: number; kind: string; prompt: string; options?: string[] };

export default function Questions({ params }: { params: { token: string } }) {
  const { token } = params;
  const [qs, setQs] = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/public/test/${token}/questions`, { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || `Failed (${r.status})`);
        setQs(j.questions ?? []);
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) return <div className="p-6">Loading questions…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!qs.length) return <div className="p-6 text-slate-600">No questions for this test.</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Questions</h1>
      <ol className="space-y-3 list-decimal pl-6">
        {qs.map((q) => (
          <li key={q.id} className="bg-white border rounded p-3">
            <div className="font-medium">{q.prompt}</div>
            {Array.isArray(q.options) && q.options.length > 0 && (
              <ul className="mt-2 list-disc pl-6 text-sm text-slate-700">
                {q.options.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            )}
          </li>
        ))}
      </ol>
      <a href={`/t/${token}/result`} className="inline-block bg-black text-white px-4 py-2 rounded">Finish (demo)</a>
    </div>
  );
}
