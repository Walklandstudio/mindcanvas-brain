"use client";
import { useEffect, useState } from "react";

type Q = { id: string; kind: string; prompt: string; options?: string[]; };

export default function ByTestRunner({ params }: { params: { testId: string } }) {
  const { testId } = params;
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [test, setTest]     = useState<{ id: string; name?: string | null; slug?: string | null } | null>(null);
  const [qs, setQs]         = useState<Q[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/public/test/by-id/${testId}/questions`, { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Failed to load");
        setTest(j.test);
        setQs(j.questions ?? []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [testId]);

  if (loading) return <div className="p-6">Loading test…</div>;
  if (error)   return <div className="p-6 text-red-600">{error}</div>;
  if (!test)   return <div className="p-6 text-red-600">Test not found.</div>;
  if (!qs.length) return <div className="p-6 text-slate-600">No questions found for this test.</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">{test.name ?? test.slug ?? test.id}</h1>
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
    </div>
  );
}
