"use client";
import { useState } from "react";

export default function TestClient({ testId, mode, questions }: { testId: string; mode: "free"|"full"; questions: any[] }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<any>(null);
  const [msg, setMsg] = useState("");

  const submit = async () => {
    setMsg("Scoring…");
    try {
      const res = await fetch(`/api/tests/${testId}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }), // { [questionId]: onum }
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "error");
      setResult(j);
      setMsg("");
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    }
  };

  return (
    <div className="mt-4">
      {questions.map((q) => (
        <div key={q.id} className="mb-5 p-4 rounded-xl bg-white/5">
          <div className="font-medium mb-2">{q.ordinal}. {q.text}</div>
          <div className="space-y-2">
            {(q.options as any[]).sort((a,b)=>a.onum-b.onum).map((o) => (
              <label key={o.onum} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`q_${q.id}`}
                  checked={answers[q.id] === o.onum}
                  onChange={() => setAnswers((A) => ({ ...A, [q.id]: o.onum }))}
                />
                <span>{o.text}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <button onClick={submit} className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-medium">Submit</button>
      {msg && <div className="mt-3 text-white/80">{msg}</div>}

      {result && (
        <div className="mt-6 p-4 rounded-xl bg-white/10">
          <div className="text-lg font-semibold">Result</div>
          <div className="mt-2">Total Points: <b>{result.total}</b></div>
          <div className="mt-1">Top Frequency: <b>{result.frequency}</b></div>
          {result.profile && <div className="mt-1">Top Profile: <b>{result.profile}</b></div>}
        </div>
      )}
    </div>
  );
}
