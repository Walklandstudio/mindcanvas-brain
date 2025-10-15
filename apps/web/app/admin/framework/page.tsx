"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const COLORS = { A: "#ef4444", B: "#f59e0b", C: "#10b981", D: "#3b82f6" };

type FrameworkRecord = {
  id?: string;
  org_id: string | null;
  name: string;
  version: string | null;
  created_at?: string | null;
  owner_id?: string | null;
  frequency_meta: any;
};

export default function FrameworkPage() {
  const router = useRouter();
  const [orgId, setOrgId] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [fw, setFw] = useState<FrameworkRecord | null>(null);

  useEffect(() => {
    const fromStorage = (typeof window !== "undefined" && localStorage.getItem("mc_org_id")) || "";
    const fromUrl = (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("orgId")) || "";
    setOrgId((fromStorage || fromUrl || "").replace(/^:/, "").trim());
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        // get goals to seed generation if needed
        const gRes = await fetch("/api/onboarding/get?step=goals", { cache: "no-store" });
        const g = (await gRes.json().catch(() => ({})))?.data || {};

        // auto-generate or fetch existing framework (writes only if orgId exists)
        const res = await fetch("/api/admin/framework/auto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId: orgId || undefined,
            orgName: "",
            industry: g?.industry || "General",
            sector: g?.sector || "General",
            primaryGoal: g?.primary_goal || "Improve team performance",
            brandTone: "confident, modern, human",
          }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || "Failed to load framework");
        setFw((j.framework || j.preview) as FrameworkRecord);
      } catch (e: any) {
        if (mounted) setErr(e?.message || "Failed to load framework");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [orgId]);

  const groups = useMemo(() => {
    if (!fw?.frequency_meta) return null;
    const fm = fw.frequency_meta;
    const frequencies =
      fm.frequencies || { A: fm?.A?.name || "A", B: fm?.B?.name || "B", C: fm?.C?.name || "C", D: fm?.D?.name || "D" };
    const profiles: { name: string; frequency: "A" | "B" | "C" | "D" }[] = fm.profiles || [];
    return (["A","B","C","D"] as const).map((f) => ({
      f, title: frequencies[f], color: COLORS[f],
      profiles: profiles.filter(p => p.frequency === f).map(p => p.name)
    }));
  }, [fw]);

  function openProfile(name: string, frequency: "A"|"B"|"C"|"D") {
    const q = new URLSearchParams({ name, frequency, orgId }).toString();
    // Goes to the editor page:
    window.location.href = `/admin/profiles/edit?${q}`;
  }

  return (
    <main className="max-w-6xl mx-auto p-6 text-white">
      <h1 className="text-2xl font-semibold">Framework</h1>
      <p className="text-white/70 mt-1">AI-generated from your onboarding. Click a card to edit its report.</p>

      {loading && <p className="mt-4 text-white/70">Loading…</p>}
      {err && <div className="mt-4 p-3 rounded-lg bg-red-500/20 border border-red-400/40 text-red-100 text-sm">{err}</div>}

      {!loading && !err && fw && groups && (
        <div className="mt-6 grid grid-cols-3 gap-6 items-center">
          {/* Left column (Profiles 8,7,6) */}
          <div className="grid gap-6">
            {["8","7","6"].map((n, i) => (
              <ProfileCard key={n} label={`Profile ${n}`} onClick={() => openProfile(groups[3 - i as 0|1|2]?.profiles[0] || `Profile ${n}`, (["D","D","C"] as const)[i])} />
            ))}
          </div>

          {/* Center column (circle + Profile 5 on bottom) */}
          <div className="flex flex-col items-center gap-6">
            <Circle groups={groups} />
            <ProfileCard label="Profile 5" onClick={() => openProfile(groups[2]?.profiles[1] || "Profile 5", "C")} />
          </div>

          {/* Right column (Profiles 1,2,3,4) */}
          <div className="grid gap-6">
            <ProfileCard label="Profile 1" onClick={() => openProfile(groups[0]?.profiles[0] || "Profile 1", "A")} />
            <ProfileCard label="Profile 2" onClick={() => openProfile(groups[1]?.profiles[0] || "Profile 2", "B")} />
            <ProfileCard label="Profile 3" onClick={() => openProfile(groups[1]?.profiles[1] || "Profile 3", "B")} />
            <ProfileCard label="Profile 4" onClick={() => openProfile(groups[2]?.profiles[0] || "Profile 4", "C")} />
          </div>
        </div>
      )}
    </main>
  );
}

function ProfileCard({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-56 h-56 rounded-xl bg-[#0f3550] hover:bg-[#134a73] transition border border-white/10 text-left p-4 shadow"
    >
      <div className="text-lg font-semibold">{label || "Profile"}</div>
      <div className="mt-4 text-sm text-white/80">Strength</div>
      <div className="text-sm text-white/80">Challenges</div>
    </button>
  );
}

function Circle({ groups }: { groups: { f: "A"|"B"|"C"|"D"; title: string; color: string }[] }) {
  return (
    <div className="relative w-64 h-64 rounded-full">
      {/* quarters */}
      <Quarter pos="top"    color="#ef4444" label={`Frequency A`} />
      <Quarter pos="right"  color="#f59e0b" label={`Frequency B`} />
      <Quarter pos="bottom" color="#10b981" label={`Frequency C`} />
      <Quarter pos="left"   color="#3b82f6" label={`Frequency D`} />
      {/* center cross */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-2 h-full bg-white/80" />
        <div className="absolute w-full h-2 bg-white/80" />
      </div>
    </div>
  );
}

function Quarter({ pos, color, label }: { pos: "top"|"right"|"bottom"|"left"; color: string; label: string }) {
  const base = "absolute w-1/2 h-1/2";
  const posClass: Record<typeof pos, string> = {
    top: "top-0 left-1/2 -translate-x-1/2 rounded-b-full",
    right: "right-0 top-1/2 -translate-y-1/2 rounded-l-full",
    bottom: "bottom-0 left-1/2 -translate-x-1/2 rounded-t-full",
    left: "left-0 top-1/2 -translate-y-1/2 rounded-r-full",
  } as const;
  const textPos: Record<typeof pos, string> = {
    top: "top-2 left-1/2 -translate-x-1/2",
    right: "right-2 top-1/2 -translate-y-1/2",
    bottom: "bottom-2 left-1/2 -translate-x-1/2",
    left: "left-2 top-1/2 -translate-y-1/2",
  } as const;
  return (
    <>
      <div className={`${base} ${posClass[pos]}`} style={{ backgroundColor: color }} />
      <span className="absolute text-xs font-medium text-white" style={{
        position: "absolute", ...(pos === "top" ? {top:8,left:"50%",transform:"translateX(-50%)"} :
          pos === "right" ? {right:8,top:"50%",transform:"translateY(-50%)"} :
          pos === "bottom" ? {bottom:8,left:"50%",transform:"translateX(-50%)"} :
          {left:8,top:"50%",transform:"translateY(-50%)"})
      }}>{label}</span>
    </>
  );
}
