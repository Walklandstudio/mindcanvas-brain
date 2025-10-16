"use client";

import { useEffect, useState } from "react";

export default function PreviewProfile() {
  const [draft, setDraft] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const id = p.get("id");
    (async () => {
      try {
        const res = await fetch(`/api/admin/profiles/drafts/${id}`);
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error || "Load failed");
        setDraft(j.draft);
      } catch (e: any) {
        setErr(e?.message || "Failed to load draft");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function signOff() {
    if (!draft?.id) return;
    try {
      const res = await fetch(`/api/admin/profiles/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "signed" }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Sign-off failed");
      window.location.href = "/admin/framework";
    } catch (e: any) {
      alert(e?.message || "Sign-off failed");
    }
  }

  if (loading) return <Main><p className="text-white/70">Loading…</p></Main>;
  if (err)     return <Main><ErrorBox>{err}</ErrorBox></Main>;
  if (!draft)  return <Main><p>No draft.</p></Main>;

  const c = draft.content || {};
  return (
    <Main>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">{draft.profile_name} — {draft.frequency}</h1>
        <div className="text-white/60 text-sm">Status: {draft.status}</div>
      </div>

      <Section title="Welcome / Introduction">{c.intro}</Section>
      <Section title="How to use the report">{c.howTo}</Section>
      <Section title="Core Overview">
        <p className="mb-2">{c?.coreOverview?.profileInDepth}</p>
        <p className="text-white/60 text-sm">Frequency: {c?.coreOverview?.frequencyName}</p>
      </Section>
      <Section title="Ideal Environment">{c.idealEnvironment}</Section>
      <Bullets title="Strengths" items={c.strengths} />
      <Bullets title="Challenges" items={c.challenges} />
      <Section title="Ideal Roles">{c.idealRoles}</Section>
      <Section title="Guidance">{c.guidance}</Section>
      <Bullets title="Real-World Examples" items={c.realWorldExamples} />
      <Section title="Additional Information">{c.additionalInfo}</Section>

      <div className="mt-6 flex gap-3">
        <a className="px-4 py-2 rounded-xl bg-white/10 border border-white/20" href={`/admin/profiles/edit?name=${encodeURIComponent(draft.profile_name)}&frequency=${draft.frequency}&draftId=${draft.id}`}>
          Edit
        </a>
        <button onClick={signOff} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-medium">
          {draft.status === "signed" ? "Re-sign" : "Sign-off"}
        </button>
        <a className="px-4 py-2 rounded-xl bg-white/10 border border-white/20" href="/admin/framework">Back</a>
      </div>
    </Main>
  );
}

function Main({ children }: { children: any }) {
  return <main className="max-w-3xl mx-auto p-8 text-white">{children}</main>;
}
function Section({ title, children }: { title: string; children: any }) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="font-medium">{title}</h2>
      <div className="mt-2 whitespace-pre-wrap">{children}</div>
    </div>
  );
}
function Bullets({ title, items = [] }: { title: string; items: string[] }) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="font-medium">{title}</h2>
      <ul className="mt-2 list-disc pl-6 space-y-1">
        {items.filter(Boolean).map((x: string, i: number) => <li key={i}>{x}</li>)}
      </ul>
    </div>
  );
}
function ErrorBox({ children }: { children: any }) {
  return <div className="p-3 rounded-lg bg-red-500/20 border border-red-400/40 text-red-100 text-sm">{children}</div>;
}
