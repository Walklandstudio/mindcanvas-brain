'use client';

import { useState } from 'react';

type Res = { ok?: boolean; error?: string; [k: string]: unknown };

export default function AdminToolsPage() {
  const [log, setLog] = useState<string>('Ready');

  async function post(path: string, label: string) {
    setLog(`${label}: running…`);
    try {
      const res = await fetch(path, { method: 'POST' });
      const json = (await res.json().catch(() => ({}))) as Res;
      if (!res.ok || json.error) {
        setLog(`${label}: FAILED — ${json.error ?? `HTTP ${res.status}`}`);
      } else {
        setLog(`${label}: OK — ${JSON.stringify(json)}`);
      }
    } catch (e) {
      setLog(`${label}: FAILED — ${String(e)}`);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Tools</h1>

      <div className="rounded-xl border p-4 bg-white space-y-4">
        <button
          onClick={() => post('/api/admin/db/migrate', 'Run DB migration')}
          className="rounded-lg bg-blue-600 text-white px-4 py-2 font-semibold hover:bg-blue-700"
        >
          Run DB migration
        </button>

        <button
          onClick={() => post('/api/admin/questions/seed', 'Seed base 15 questions')}
          className="rounded-lg bg-green-600 text-white px-4 py-2 font-semibold hover:bg-green-700"
        >
          Seed base 15 questions
        </button>

        <pre className="mt-4 whitespace-pre-wrap text-sm border rounded p-3 bg-gray-50">
{log}
        </pre>
      </div>

      <p className="text-xs text-gray-600">
        Note: this page works only when you’re logged in to the admin (protected by middleware).
      </p>
    </main>
  );
}
