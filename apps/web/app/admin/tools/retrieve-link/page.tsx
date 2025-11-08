"use client";
import { useEffect, useState } from "react";

type Org = { id: string; slug: string; name: string };
type Test = { id: string; name: string; test_type: string; is_active: boolean };

export default function RetrieveLinkTool() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [orgId, setOrgId] = useState("");
  const [testId, setTestId] = useState("");
  const [showResults, setShowResults] = useState(true);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/orgs").then((r) => r.json()).then(setOrgs);
  }, []);

  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/admin/tests?orgId=${orgId}`)
      .then((r) => r.json())
      .then(setTests);
  }, [orgId]);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          testId,
          showResults,
          hiddenResultsMessage: showResults ? null : (message || null),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(`Error: ${data.error || "unknown"}`);
      } else {
        await navigator.clipboard.writeText(data.url);
        alert(`Link copied to clipboard:\n${data.url}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Link Generator</h1>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block">Organisation</span>
          <select
            className="w-full rounded border p-2"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
          >
            <option value="">Select organisation…</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.slug})
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block">Test</span>
          <select
            className="w-full rounded border p-2"
            value={testId}
            onChange={(e) => setTestId(e.target.value)}
            disabled={!orgId}
          >
            <option value="">Select test…</option>
            {tests.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.test_type})
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showResults}
          onChange={() => setShowResults((v) => !v)}
        />
        Show results to test taker
      </label>

      {!showResults && (
        <label className="block text-sm">
          <span className="mb-1 block">Message shown after completion</span>
          <textarea
            rows={4}
            className="w-full rounded border p-2"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Thanks for completing the assessment. Your facilitator will walk you through the results in our workshop…"
          />
        </label>
      )}

      <button
        className="rounded bg-black px-3 py-2 text-white text-sm disabled:opacity-50"
        disabled={!orgId || !testId || loading}
        onClick={generate}
      >
        {loading ? "Generating…" : "Generate Link"}
      </button>
    </div>
  );
}
