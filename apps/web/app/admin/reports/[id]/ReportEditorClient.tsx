// apps/web/app/admin/reports/[id]/ReportEditorClient.tsx
"use client";

import { useEffect, useState } from "react";

type Report = { strengths: string; challenges: string; roles: string; guidance: string; approved: boolean; };
type Loader = {
  profile: { id: string; name: string; frequency: "A" | "B" | "C" | "D" };
  frequencyName: string;
  report: Report & { profile_id: string };
  context: { brandTone: string; industry: string; sector: string; company: string };
};

export default function ReportEditorClient({ id }: { id: string }) {
  const [data, setData] = useState<Loader | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function notify(s: string) { setToast(s); setTimeout(() => setToast(null), 2400); }

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j?.error || `Failed to load (HTTP ${res.status})`);
        setData(null);
      } else {
        setData(j);
      }
    } catch (e: any) {
      setErr(e?.message || "Network error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function save() {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data.report),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Save failed");
      notify("Draft saved ✓");
    } catch (e: any) {
      notify(e?.message || "Save failed");
    } finally { setSaving(false); }
  }

  async function draftAI() {
    setBusy("draft");
    try {
      const res = await fetch(`/api/admin/reports/${id}?action=draft`, { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "AI draft failed");
      await load();
      notify("AI draft created");
    } catch (e: any) {
      notify(e?.message || "AI draft failed");
    } finally { setBusy(null); }
  }

  async function signoff() {
    setBusy("signoff");
    try {
      const res = await fetch(`/api/admin/reports/${id}?action=signoff`, { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Sign-off failed");
      await load();
      notify("Report approved ✓");
    } catch (e: any) {
      notify(e?.message || "Sign-off failed");
    } finally { setBusy(null); }
  }

  if (loading) {
    return <main className="max-w-5xl mx-auto p-6 text-white"><div className="text-white/80">Loading…</div></main>;
  }

  if (err) {
    return (
      <main className="max-w-5xl mx-auto p-6 text-white">
        <a href="/admin/reports/signoff" className="text-white/70 hover:text-white text-sm">← Back</a>
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="text-red-300 font-medium">Couldn’t load this report</div>
          <div className="text-red-200/90 text-sm mt-1 break-words">{err}</div>
          <div className="mt-4 flex gap-2">
            <button onClick={load} className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15">Retry</button>
            <a href="/admin/reports/signoff" className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500">Back to Reports</a>
          </div>
        </div>
      </main>
    );
  }

  if (!data) return <main className="max-w-5xl mx-auto p-6 text-white">No data.</main>;

  const { profile, frequencyName } = data;

  return (
    <main className="max-w-6xl mx-auto p-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <a href="/admin/reports/signoff" className="text-white/70 hover:text-white text-sm">← Back</a>
          <h1 className="text-2xl font-semibold mt-2">Report Builder</h1>
          <div className="text-white/70 text-sm">
            Profile: <span className="font-medium text-white">{profile.name}</span> · Frequency {profile.frequency} ({frequencyName})
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={draftAI} disabled={busy === "draft"} className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 disabled:opacity-50">
            {busy === "draft" ? "Drafting…" : "Use AI → Draft sections"}
          </button>
          <button onClick={save} disabled={saving} className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50">
            {saving ? "Saving…" : "Save draft"}
          </button>
          <button onClick={signoff} disabled={busy === "signoff"} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50">
            {busy === "signoff" ? "Signing…" : "Sign off"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <Section title="Strengths"  value={data.report.strengths}  onChange={(v) => setData({ ...data, report: { ...data.report, strengths: v } })} />
        <Section title="Challenges" value={data.report.challenges} onChange={(v) => setData({ ...data, report: { ...data.report, challenges: v } })} />
        <Section title="Ideal Roles" value={data.report.roles} onChange={(v) => setData({ ...data, report: { ...data.report, roles: v } })} />
        <Section title="Guidance"   value={data.report.guidance}   onChange={(v) => setData({ ...data, report: { ...data.report, guidance: v } })} />
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-white/10 border border-white/15">{toast}</div>}
    </main>
  );
}

function Section({ title, value, onChange }: { title: string; value: string; onChange: (v: string) => void; }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-medium mb-2">{title}</div>
      <textarea className="w-full h-56 rounded-xl bg-black/20 border border-white/10 p-3 outline-none" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
