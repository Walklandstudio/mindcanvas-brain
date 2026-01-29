// apps/web/app/admin/orgs/[orgId]/import-test/ImportTestClient.tsx
"use client";

import { useState } from "react";

export default function ImportTestClient({
  orgId,
  orgName,
  orgSlug,
}: {
  orgId: string;
  orgName: string;
  orgSlug: string;
}) {
  const [rawJson, setRawJson] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    testName?: string;
    testSlug?: string;
    token?: string;
  } | null>(null);

  async function handleImport() {
    setBusy(true);
    setError(null);
    setSuccess(null);

    let parsed: any;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      setBusy(false);
      setError("Invalid JSON. Please check your syntax.");
      return;
    }

    try {
      const res = await fetch(`/api/admin/orgs/${orgId}/import-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Import failed");
      }

      setSuccess({
        testName: json.test?.name,
        testSlug: json.test?.slug,
        token: json.link?.token,
      });
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function loadExample() {
    const example = {
      test: {
        name: "Example Leadership Diagnostic",
        slug: "example-leadership",
        description: "Demo test imported via JSON",
        test_type: "qsc",
      },
      questions: [
        {
          idx: 1,
          text: "When leading a new initiative, I tend to...",
          options: [
            {
              label: "A",
              value: "Paint a bold, inspiring vision",
              profile: "A",
              points: 1,
            },
            {
              label: "B",
              value:
                "Support the team and ensure everyone feels included",
              profile: "B",
              points: 1,
            },
            {
              label: "C",
              value: "Design clear structures and processes",
              profile: "C",
              points: 1,
            },
            {
              label: "D",
              value: "Challenge assumptions and explore alternatives",
              profile: "D",
              points: 1,
            },
          ],
        },
      ],
    };

    setRawJson(JSON.stringify(example, null, 2));
    setError(null);
    setSuccess(null);
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <h1 className="text-2xl font-semibold">Import Test for {orgName}</h1>
      {orgSlug && (
        <p className="text-sm text-slate-400">
          Portal slug: <code>/portal/{orgSlug}</code>
        </p>
      )}

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200 space-y-1">
          <div>Import successful.</div>
          {success.testName && (
            <div>
              Test: <strong>{success.testName}</strong> ({success.testSlug})
            </div>
          )}
          {success.token && (
            <div className="text-xs">
              Default link token: <code>{success.token}</code>
              <br />
              Public test URL:{" "}
              <code>{`https://www.profiletest.app/t/${success.token}`}</code>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-300">
          Paste your test JSON below. You can also load an example to see the
          expected format.
        </p>
        <button
          type="button"
          onClick={loadExample}
          className="text-xs rounded-md border border-slate-600 px-3 py-1 hover:bg-slate-800/60"
        >
          Load example JSON
        </button>
      </div>

      <textarea
        className="w-full h-80 rounded-md border bg-slate-950/70 border-slate-700 px-3 py-2 text-xs font-mono text-slate-100"
        value={rawJson}
        onChange={(e) => {
          setRawJson(e.target.value);
          setError(null);
          setSuccess(null);
        }}
        placeholder='{
  "test": { "name": "...", "slug": "...", "test_type": "qsc" },
  "questions": [ ... ]
}'
      />

      <div className="flex justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={handleImport}
          className="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
        >
          {busy ? "Importing…" : "Import Test"}
        </button>
      </div>
    </div>
  );
}
