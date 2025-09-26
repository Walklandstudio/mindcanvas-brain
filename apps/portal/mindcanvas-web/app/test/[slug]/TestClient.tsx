// app/test/[slug]/TestClient.tsx
"use client";

import { useState } from "react";
import type { TestConfig } from "@/lib/testConfigs";

type SubmissionResp = { ok?: boolean; id?: string; error?: string };
type FinishResp = { ok?: boolean; id?: string; error?: string };

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-gray-700">{label}</span>
      <input
        className="mt-1 w-full border rounded px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
      />
    </label>
  );
}

export default function TestClient({ testConfig }: { testConfig: TestConfig }) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const onPick = (qid: string, key: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: key }));
  };

  async function submit() {
    setLoading(true);
    setStatus("");
    try {
      // 1) create submission
      const subRes = await fetch("/api/tests/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test_slug: testConfig.slug,
          first_name: first || undefined,
          last_name: last || undefined,
          email: email || undefined,
        }),
      });
      const subJson = (await subRes.json()) as SubmissionResp;
      if (!subRes.ok || !subJson.id) {
        setStatus(subJson.error || "Could not create submission");
        return;
      }

      // 2) finish (score + persist)
      const finRes = await fetch(
        `/api/submissions/${encodeURIComponent(subJson.id)}/finish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: testConfig.slug, answers }),
        }
      );
      const finJson = (await finRes.json()) as FinishResp;
      if (!finRes.ok || !finJson.ok) {
        setStatus(finJson.error || "Could not save result");
        return;
      }

      // 3) go to report
      location.href = `/report/${encodeURIComponent(subJson.id)}`;
    } catch {
      setStatus("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{testConfig.title}</h1>
        {testConfig.intro && (
          <p className="text-sm text-gray-600">{testConfig.intro}</p>
        )}
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="First name" value={first} onChange={setFirst} />
        <Field label="Last name" value={last} onChange={setLast} />
        <Field label="Email" value={email} onChange={setEmail} type="email" />
      </div>

      <ol className="space-y-4">
        {testConfig.questions.map((q, idx) => (
          <li key={q.id} className="border rounded-xl p-4">
            <div className="font-medium mb-2">
              {idx + 1}. {q.prompt}
            </div>
            <div className="space-y-2">
              {q.options.map((o) => (
                <label key={o.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={q.id}
                    value={o.key}
                    checked={answers[q.id] === o.key}
                    onChange={() => onPick(q.id, o.key)}
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <div className="flex items-center gap-3">
        <button
          className="border rounded-lg px-4 py-2"
          onClick={submit}
          disabled={
            loading || Object.keys(answers).length < testConfig.questions.length
          }
        >
          {loading ? "Submitting…" : "Submit"}
        </button>
        {status && <span className="text-sm text-red-600">{status}</span>}
      </div>
    </main>
  );
}
