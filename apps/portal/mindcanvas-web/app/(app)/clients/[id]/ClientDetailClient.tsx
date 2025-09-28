'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type AnswerDTO = {
  question_id: string;
  question: string;
  answers: string[];
};

type DetailPayload = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  profile_code: string | null;
  flow_a: number;
  flow_b: number;
  flow_c: number;
  flow_d: number;
  answers: AnswerDTO[];
};

export default function ClientDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<DetailPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr(null);
        setData(null);
        const res = await fetch(`/api/admin/clients/${id}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(await res.text());
        const json = (await res.json()) as DetailPayload;
        if (alive) setData(json);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const flowStr = useMemo(() => {
    if (!data) return '0/0/0/0';
    return `${data.flow_a ?? 0}/${data.flow_b ?? 0}/${data.flow_c ?? 0}/${data.flow_d ?? 0}`;
  }, [data]);

  const onDelete = async () => {
    if (!confirm('Delete this client and all their answers? This cannot be undone.')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/clients/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      router.replace('/clients');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Client</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            ← Back
          </button>
          <button
            onClick={onDelete}
            disabled={busy}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      {!data && !err && (
        <div className="rounded-xl border px-4 py-8 text-center text-sm text-gray-600">
          Loading…
        </div>
      )}

      {data && (
        <>
          <div className="mb-6 rounded-xl border p-4">
            <div className="mb-3">
              <div className="text-sm text-gray-500">
                {new Date(data.created_at).toLocaleString()}
              </div>
              <div className="mt-1 text-lg font-medium">{data.name || '—'}</div>
              <div className="text-sm text-gray-700">{data.email || '—'}</div>
              <div className="text-sm text-gray-700">{data.phone || '—'}</div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-gray-500">Profile</div>
                <div className="mt-1 text-base font-medium">
                  {data.profile_code ?? '—'}
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-xs text-gray-500">Flow (A/B/C/D)</div>
                <div className="mt-1 text-base font-medium">{flowStr}</div>
              </div>
            </div>
          </div>

          <details className="rounded-xl border p-4" open>
            <summary className="cursor-pointer text-sm font-medium">Answers</summary>
            <div className="mt-3 space-y-3">
              {data.answers.length === 0 && (
                <div className="text-sm text-gray-600">No answers recorded.</div>
              )}
              {data.answers.map((a) => (
                <div key={a.question_id} className="rounded-lg border p-3">
                  <div className="text-sm font-medium">
                    {a.question || a.question_id}
                  </div>
                  <div className="mt-1 text-sm text-gray-700">
                    {a.answers.length ? a.answers.join(', ') : '—'}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </>
      )}
    </div>
  );
}
