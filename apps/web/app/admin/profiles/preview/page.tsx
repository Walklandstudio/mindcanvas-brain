"use client";

import { useEffect, useState } from "react";

export default function PreviewProfile() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("mc_profile_preview") : null;
    if (raw) setData(JSON.parse(raw));
  }, []);

  if (!data) {
    return (
      <main className="max-w-3xl mx-auto p-8 text-white">
        <h1 className="text-2xl font-semibold">Preview</h1>
        <p className="text-white/60 mt-2">No draft found. Go back to the editor.</p>
        <a className="inline-block mt-4 px-4 py-2 rounded-xl bg-white/10 border border-white/20" href="/admin/framework">
          Back to Framework
        </a>
      </main>
    );
  }

  const { name, frequency, draft } = data;

  return (
    <main className="max-w-3xl mx-auto p-8 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">{name} — {frequency}</h1>
        <a className="px-4 py-2 rounded-xl bg-white/10 border border-white/20" href="/admin/profiles/edit?name=${name}&frequency=${frequency}">
          Edit
        </a>
      </div>

      <Section title="Welcome / Introduction">{draft.intro}</Section>
      <Section title="How to use the report">{draft.howTo}</Section>
      <Section title="Core Overview">
        <p className="mb-2">{draft.coreOverview.profileInDepth}</p>
        <p className="text-white/60 text-sm">Frequency: {draft.coreOverview.frequencyName}</p>
      </Section>
      <Section title="Ideal Environment">{draft.idealEnvironment}</Section>
      <Bullets title="Strengths" items={draft.strengths} />
      <Bullets title="Challenges" items={draft.challenges} />
      <Section title="Ideal Roles">{draft.idealRoles}</Section>
      <Section title="Guidance">{draft.guidance}</Section>
      <Bullets title="Real-World Examples" items={draft.realWorldExamples} />
      <Section title="Additional Information">{draft.additionalInfo}</Section>

      <div className="mt-6 flex gap-3">
        <button className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-medium">Sign-off</button>
        <a className="px-4 py-2 rounded-xl bg-white/10 border border-white/20" href="/admin/framework">Back</a>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="font-medium">{title}</h2>
      <div className="mt-2 whitespace-pre-wrap">{children}</div>
    </div>
  );
}
function Bullets({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="font-medium">{title}</h2>
      <ul className="mt-2 list-disc pl-6 space-y-1">
        {(items || []).filter(Boolean).map((x, i) => <li key={i}>{x}</li>)}
      </ul>
    </div>
  );
}
