"use client";
import { useState } from "react";

export default function CreateShareClient({ testId }: { testId: string }) {
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true); setError(null);
    try {
      const r = await fetch(`/api/tests/${testId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_uses: 1 }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Create link failed");
      const t = j?.link?.token as string | undefined;
      if (!t) throw new Error("No token returned");
      setToken(t);
      await navigator.clipboard?.writeText(`${window.location.origin}/t/${t}/start`);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border rounded p-4 space-y-2">
      <button
        onClick={create}
        disabled={busy}
        className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
      >
        {busy ? "Creating…" : "Create & Copy Link"}
      </button>
      {token && (
        <div className="text-sm">
          Link created → <code className="bg-slate-100 px-1">{token}</code>{" "}
          <a className="underline" href={`/t/${token}/start`}>open</a>
        </div>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}
