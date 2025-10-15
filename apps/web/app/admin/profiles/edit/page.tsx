"use client";

import { useEffect, useState } from "react";

type Draft = {
  intro: string;
  howTo: string;
  coreOverview: { profileInDepth: string; frequencyName: string };
  idealEnvironment: string;
  strengths: string[];
  challenges: string[];
  idealRoles: string;
  guidance: string;
  realWorldExamples: string;
  additionalInfo: string;
};

export default function ProfileEdit() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const [name, setName] = useState(params.get("name") || "Profile");
  const [frequency, setFrequency] = useState<"A"|"B"|"C"|"D">(
    (params.get("frequency") as any) || "A"
  );
  const [brandTone, setBrandTone] = useState(params.get("brandTone") || "confident, modern, human");
  const [industry, setIndustry] = useState(params.get("industry") || "General");
  const [sector, setSector] = useState(params.get("sector") || "General");
  const [company, setCompany] = useState(params.get("company") || "Your Organization");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [draft, setDraft] = useState<Draft>({
    intro: "",
    howTo: "",
    coreOverview: { profileInDepth: "", frequencyName: "" },
    idealEnvironment: "",
    strengths: [],
    challenges: [],
    idealRoles: "",
    guidance: "",
    realWorldExamples: "",
    additionalInfo: "",
  });

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
          profileName: name,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Generation failed");

      // Map your AI helpers into your 10-section structure
      setDraft({
        intro: `Welcome to the ${name} report for ${company}.`,
        howTo: "Use this report as a practical guide. Skim the strengths, flag the challenges, then review ideal roles and guidance to plan action.",
        coreOverview: {
          profileInDepth: j.summary || "Concise profile overview.",
          frequencyName: `Frequency ${frequency}`,
        },
        idealEnvironment: j.sections?.roles || "Environment suggestions will appear here.",
        strengths: j.strengths || [],
        challenges: (j.sections?.challenges ? [j.sections.challenges] : []),
        idealRoles: j.sections?.roles || "",
        guidance: j.sections?.guidance || "",
        realWorldExamples: "Add examples from your organization or industry that embody this profile.",
        additionalInfo: "",
      });
    } catch (e: any) {
      setErr(e?.message || "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  function saveAndPreview() {
    // Persist later as needed; for now navigate to a simple preview route or toast success
    alert("Saved. (Wire up DB persistence when ready.)");
    // window.location.href = `/admin/profiles/preview?name=${encodeURIComponent(name)}&frequency=${frequency}`;
  }

  return (
    <main className="max-w-3xl mx-auto p-8 text-white">
      <h1 className="text-3xl font-semibold">Profile Editor</h1>
      <p className="text-white/60 mb-6">Generate and edit content for the selected profile.</p>

      {/* Context row */}
      <div className="grid grid-cols-2 gap-4">
        <Input label="Profile name" value={name} onChange={setName} />
        <Input label="Frequency" value={frequency} onChange={() => {}} readOnly />
        <Input label="Brand tone" value={brandTone} onChange={setBrandTone} />
        <Input label="Company" value={company} onChange={setCompany} />
        <Input label="Industry" value={industry} onChange={setIndustry} />
        <Input label="Sector" value={sector} onChange={setSector} />
      </div>

      <div className="flex gap-3 mt-4">
        <a className="px-4 py-2 rounded-xl bg-white/10 border border-white/20" href="/admin/framework">Back</a>
        <button onClick={generate} disabled={loading} className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-medium disabled:opacity-60">
          {loading ? "Generating…" : "Generate Draft"}
        </button>
      </div>

      {err && <div className="mt-4 p-3 rounded-lg bg-red-500/20 border border-red-400/40 text-red-100 text-sm">{err}</div>}

      {/* 10 sections */}
      <div className="mt-8 grid gap-6">
        <EditorBlock title="Section 1 · Welcome / Introduction" value={draft.intro} onChange={(v)=>setDraft(d => ({...d, intro:v}))} />
        <EditorBlock title="Section 2 · How to use the report" value={draft.howTo} onChange={(v)=>setDraft(d => ({...d, howTo:v}))} />
        <Card>
          <h2 className="font-medium">Section 3 · Core Overview</h2>
          <div className="text-white/60 text-sm mt-2">Profile In Depth</div>
          <textarea className="w-full mt-1 p-3 rounded bg-white text-black" rows={4}
            value={draft.coreOverview.profileInDepth}
            onChange={(e)=>setDraft(d=>({...d, coreOverview:{...d.coreOverview, profileInDepth:e.target.value}}))}
          />
          <div className="text-white/60 text-sm mt-3">Frequency</div>
          <input className="w-full mt-1 p-3 rounded bg-white text-black"
            value={draft.coreOverview.frequencyName}
            onChange={(e)=>setDraft(d=>({...d, coreOverview:{...d.coreOverview, frequencyName:e.target.value}}))}
          />
        </Card>

        <EditorBlock title="Section 4 · Ideal Environment" value={draft.idealEnvironment} rows={4} onChange={(v)=>setDraft(d=>({...d, idealEnvironment:v}))} />

        <Card>
          <h2 className="font-medium">Section 5 · Strengths</h2>
          <TagList items={draft.strengths} onChange={(items)=>setDraft(d=>({...d, strengths:items}))} />
        </Card>

        <Card>
          <h2 className="font-medium">Section 6 · Challenges</h2>
          <TagList items={draft.challenges} onChange={(items)=>setDraft(d=>({...d, challenges:items}))} />
        </Card>

        <EditorBlock title="Section 7 · Ideal Roles" value={draft.idealRoles} rows={3} onChange={(v)=>setDraft(d=>({...d, idealRoles:v}))} />
        <EditorBlock title="Section 8 · Guidance" value={draft.guidance} rows={4} onChange={(v)=>setDraft(d=>({...d, guidance:v}))} />
        <EditorBlock title="Section 9 · Real-World Examples" value={draft.realWorldExamples} rows={4} onChange={(v)=>setDraft(d=>({...d, realWorldExamples:v}))} />
        <EditorBlock title="Section 10 · Additional Information" value={draft.additionalInfo} rows={3} onChange={(v)=>setDraft(d=>({...d, additionalInfo:v}))} />

        <div className="flex gap-3">
          <button onClick={saveAndPreview} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-medium">
            Save, Preview & Sign-off
          </button>
          <a className="px-4 py-2 rounded-xl bg-white/10 border border-white/20" href="/admin/framework">Cancel</a>
        </div>
      </div>
    </main>
  );
}

function Input({ label, value, onChange, readOnly=false }:{
  label: string; value: string; onChange: (v:string)=>void; readOnly?: boolean
}) {
  return (
    <label className="block">
      <span className="block text-sm text-white/60">{label}</span>
      <input className="w-full rounded bg-white text-black p-3" value={value} readOnly={readOnly}
        onChange={(e)=>onChange(e.target.value)} />
    </label>
  );
}
function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-5">{children}</div>;
}
function EditorBlock({ title, value, onChange, rows=3 }:{
  title: string; value: string; onChange: (v:string)=>void; rows?: number;
}) {
  return (
    <Card>
      <h2 className="font-medium">{title}</h2>
      <textarea className="w-full mt-2 p-3 rounded bg-white text-black" rows={rows}
        value={value} onChange={(e)=>onChange(e.target.value)} />
    </Card>
  );
}
function TagList({ items, onChange }: { items: string[]; onChange: (items:string[])=>void }) {
  const [input, setInput] = useState("");
  return (
    <div>
      <div className="flex gap-2 flex-wrap">
        {items.map((t, i) => (
          <span key={i} className="px-2 py-1 rounded bg-white/10 border border-white/10">
            {t}
            <button className="ml-2 text-white/60" onClick={()=>onChange(items.filter((_,idx)=>idx!==i))}>×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        <input className="flex-1 rounded bg-white text-black p-2" value={input} onChange={(e)=>setInput(e.target.value)} placeholder="Add item…" />
        <button className="px-3 py-2 rounded bg-white/20 border border-white/20"
          onClick={()=>{ if (input.trim()) { onChange([...items, input.trim()]); setInput(""); } }}>
          Add
        </button>
      </div>
    </div>
  );
}
