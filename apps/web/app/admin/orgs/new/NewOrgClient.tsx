// apps/web/app/admin/orgs/new/NewOrgClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewOrgClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });

      const json = await res.json();
      if (!res.ok || !json.org) {
        throw new Error(json.error || "Failed to create organisation");
      }

      // After creating, go back to the portal admin org list
      router.push("/portal/admin");
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function handleNameChange(v: string) {
    setName(v);
    if (!slug) {
      setSlug(
        v
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
      );
    }
  }

  return (
    <div className="min-h-screen mc-bg text-white flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 px-6 py-6 shadow-lg space-y-5"
      >
        <h1 className="text-xl font-semibold">Add organisation</h1>

        {error && (
          <div className="rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium">Name</label>
          <input
            className="w-full rounded-lg border border-white/15 bg-slate-950/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Aurora Leadership Group"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Slug</label>
          <input
            className="w-full rounded-lg border border-white/15 bg-slate-950/60 px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. aurora-leadership"
            required
          />
          <p className="text-xs text-slate-400 mt-1">
            Used in URLs like <code>/portal/{slug || "your-org"}</code>.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/portal/admin")}
            className="text-sm text-slate-300 hover:text-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create organisation"}
          </button>
        </div>
      </form>
    </div>
  );
}
