"use client";

import { useEffect, useState } from "react";

type Draft = {
  summary: string;
  strengths: string[];
  sections: { strengths: string; challenges: string; roles: string; guidance: string };
};

export default function ProfileEdit() {
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<"A"|"B"|"C"|"D">("A");
  const [brandTone, setBrandTone] = useState("confident, modern, human");
  const [industry, setIndustry] = useState("General");
  const [sector, setSector] = useState("General");
  const [company, setCompany] = useState("Your Organization");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const n = p.get("name") || "";
    const f = (p.get("frequency") || "A") as "A"|"B"|"C"|"D";
    setName(n);
    setFrequency(f);
  }, []);

  async function generate() {
    try {
      setLoading(true);
      setErr("");
      const res = await fetch("/api/admin/profiles/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandTone, industry, sector, company,
          frequencyName: `Frequency ${frequency}`,
          profileName: name || "Profile",
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Generation failed");
      setDraft(j);
    } catch (e: any) {
      setErr(e?.message || "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 text-white">
      <h1 className="text-2xl font-semibold">Profile Editor</h1>
      <p className="text-white/70 mt-1">Generate and edit content for the selected profile.</p>

      <div className="mt-4 grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-sm text-white/70">Profile name</span>
            <input className="w-full rounded bg-white text-black p-3" value={name} onChange={(e)=>setName(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-sm text-white/70">Frequency</span>
            <input className="w-full rounded bg-white text-black p-3" value={frequency} readOnly />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-sm text-white/70">Brand tone</span>
            <input className="w-full rounded bg-white text-black p-3" value={brandTone} onChange={(e)=>setBrandTone(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-sm text-white/70">Company</span>
            <input className="w-full rounded bg-white text-black p-3" value={company} onChange={(e)=>setCompany(e.target.value)} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-sm text-white/70">Industry</span>
            <input className="w-full rounded bg-white text-black p-3" value={industry} onChange={(e)=>setIndustry(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-sm text-white/70">Sector</span>
            <input className="w-full rounded bg-white text-black p-3" value={sector} onChange={(e)=>setSector(e.target.value)} />
          </label>
        </div>

        <div className="flex gap-3 mt-2">
          <a className="px-4 py-2 rounded-xl bg-white/10 border border-white/20" href="/admin/framework">Back</a>
          <button onClick={generate} disabled={loading} className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-medium disabled:opacity-60">
            {loading ? "Generating…" : "Generate Draft"}
          </button>
        </div>

        {err && <div className="mt-3 p-3 rounded-lg bg-red-500/20 border border-red-400/40 text-red-100 text-sm">{err}</div>}

        {draft && (
          <div className="mt-6 grid gap-4">
            <div className="rounded-lg border border-white/10 p-4">
              <h2 className="font-medium">Summary</h2>
              <p className="mt-1 text-white/90">{draft.summary}</p>
              <ul className="mt-2 list-disc pl-5 text-white/90">
                {draft.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div className="rounded-lg border border-white/10 p-4">
              <h2 className="font-medium">Report Sections</h2>
              <h3 className="mt-2 text-white/70">Strengths</h3><p>{draft.sections.strengths}</p>
              <h3 className="mt-2 text-white/70">Challenges</h3><p>{draft.sections.challenges}</p>
              <h3 className="mt-2 text-white/70">Ideal Roles</h3><p>{draft.sections.roles}</p>
              <h3 className="mt-2 text-white/70">Guidance</h3><p>{draft.sections.guidance}</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
