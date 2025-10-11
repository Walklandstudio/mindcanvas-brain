// apps/web/app/admin/test-builder/page.tsx
"use client";
import { useState } from "react";

export default function TestBuilderPage() {
  const [msg, setMsg] = useState("");

  async function post(url: string, body?: any) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || "error");
    return j;
  }

  const seed = async () => {
    setMsg("Seeding base questions…");
    try {
      const j = await post("/api/admin/tests/seed-base");
      setMsg(`Seeded ${j.count} questions ✓`);
    } catch (e: any) {
      setMsg(`Seed failed: ${e.message}`);
    }
  };

  const create = async (mode: "free" | "full") => {
    setMsg(`Creating ${mode} test…`);
    try {
      const j = await post("/api/admin/tests/create", { mode });
      setMsg(`Created ${mode} test ✓ → /test/${j.test_id}`);
    } catch (e: any) {
      setMsg(`Create failed: ${e.message}`);
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-6 text-white">
      <h1 className="text-2xl font-semibold">Test Builder</h1>
      <p className="text-white/70">Seed base questions, then create a Free (7) or Full (15) test.</p>

      <div className="mt-6 flex gap-3">
        <button onClick={seed} className="px-4 py-2 rounded-xl bg-white text-black font-medium">Seed Base Questions</button>
        <button onClick={() => create("free")} className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-medium">Create Free Test</button>
        <button onClick={() => create("full")} className="px-4 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-600 font-medium">Create Full Test</button>
      </div>

      {msg && <p className="mt-4 text-white/80">{msg}</p>}
    </main>
  );
}
