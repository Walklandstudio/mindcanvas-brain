"use client";

import { useEffect, useMemo, useState } from "react";

const COLORS = { A: "#ef4444", B: "#f59e0b", C: "#10b981", D: "#3b82f6" };

type FrameworkRecord = {
  id?: string;
  org_id: string | null;
  name: string;
  version: string | null;
  created_at?: string | null;
  owner_id?: string | null;
  frequency_meta: {
    frequencies?: Record<"A"|"B"|"C"|"D", string>;
    profiles?: { name: string; frequency: "A"|"B"|"C"|"D" }[];
    A?: { name?: string }; B?: { name?: string }; C?: { name?: string }; D?: { name?: string };
  };
};

type Group = {
  f: "A"|"B"|"C"|"D";
  title: string;
  color: string;
  profiles: string[];
};

type Blurb = { key: string; name: string; frequency: "A"|"B"|"C"|"D"; blurb: string };

export default function FrameworkPage() {
  const [orgId, setOrgId] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [fw, setFw] = useState<FrameworkRecord | null>(null);
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [blurbs, setBlurbs] = useState<Record<string, Blurb>>({});
  const [goals, setGoals] = useState<{industry?:string;sector?:string;primary_goal?:string}>({});

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

        const gRes = await fetch("/api/onboarding/get?step=goals", { cache: "no-store" });
        const g = (await gRes.json().catch(() => ({})))?.data || {};
        if (!mounted) return;
        setGoals(g);

        // auto-generate or return existing (writes only if orgId exists)
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
        const record = (j.framework || j.preview) as FrameworkRecord;
        if (!mounted) return;
        setFw(record);

        // normalize groups
        const fm = record.frequency_meta || {};
        const frequencies =
          fm.frequencies || {
            A: fm.A?.name || "A",
            B: fm.B?.name || "B",
            C: fm.C?.name || "C",
            D: fm.D?.name || "D",
          };
        const profiles: { name: string; frequency: "A"|"B"|"C"|"D" }[] = fm.profiles || [];
        const gs: Group[] = (["A","B","C","D"] as const).map((f) => ({
          f,
          title: frequencies[f],
          color: COLORS[f],
          profiles: profiles.filter((p) => p.frequency === f).map((p) => p.name),
        }));
        setGroups(gs);

        // fetch blurbs for the 8 profiles
        if (profiles.length > 0) {
          const bRes = await fetch("/api/admin/profiles/blurbs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              brandTone: "confident, modern, human",
              industry: g?.industry || "General",
              sector: g?.sector || "General",
              company: "Your Organization",
              profiles,
            }),
          });
          const bJson = await bRes.json().catch(() => ({}));
          const dict: Record<string, Blurb> = {};
          (bJson?.blurbs || []).forEach((b: Blurb) => { dict[b.key] = b; });
          if (mounted) setBlurbs(dict);
        }
      } catch (e: any) {
        if (mounted) setErr(e?.message || "Failed to load framework");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [orgId]);

  function openProfile(name: string, frequency: "A"|"B"|"C"|"D") {
    const q = new URLSearchParams({
      name, frequency, orgId,
      industry: goals.industry || "General",
      sector: goals.sector || "General",
      company: "Your Organization",
      brandTone: "confident, modern, human",
    }).toString();
    window.location.href = `/admin/profiles/edit?${q}`;
  }

  // Card list mapping in the exact order/layout of your mock
  // Left column: 8, 7, 6.  Center bottom: 5.  Right column: 1,2,3,4. Top center handled by right column with profile 1/2 at top.
  const positions = useMemo(() => {
    if (!groups) return null;
    // Derive the ordered names (A has first two, B next two, C next two, D last two)
    const a = groups[0]?.profiles || [];
    const b = groups[1]?.profiles || [];
    const c = groups[2]?.profiles || [];
    const d = groups[3]?.profiles || [];
    const ordered: { label: string; name: string; freq: "A"|"B"|"C"|"D" }[] = [
      { label: "Profile 1", name: a[0] || "Profile 1", freq: "A" },
      { label: "Profile 2", name: b[0] || "Profile 2", freq: "B" },
      { label: "Profile 3", name: b[1] || "Profile 3", freq: "B" },
      { label: "Profile 4", name: c[0] || "Profile 4", freq: "C" },
      { label: "Profile 5", name: c[1] || "Profile 5", freq: "C" },
      { label: "Profile 6", name: d[0] || "Profile 6", freq: "D" },
      { label: "Profile 7", name: d[1] || "Profile 7", freq: "D" },
      { label: "Profile 8", name: a[1] || "Profile 8", freq: "A" },
    ];
    return ordered;
  }, [groups]);

  return (
    <main className="max-w-[1200px] mx-auto p-8 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Framework</h1>
          <p className="text-white/60">Auto-generated from onboarding. Click a card to edit the profile’s report.</p>
        </div>
        <div className="text-white/60 text-sm">{fw?.name}</div>
      </div>

      {loading && <p className="mt-6 text-white/70">Loading…</p>}
      {err && <div className="mt-6 p-3 rounded-lg bg-red-500/20 border border-red-400/40 text-red-100 text-sm">{err}</div>}

      {!loading && !err && groups && positions && (
        <div className="grid grid-cols-[280px_1fr_280px] gap-8 mt-8 items-start">
          {/* Left stack */}
          <div className="grid gap-6">
            <ProfileCard
              title={positions[7].label}
              name={positions[7].name}
              blurb={blurbs[`A:${positions[7].name}`]?.blurb}
              onClick={() => openProfile(positions[7].name, positions[7].freq)}
            />
            <ProfileCard
              title={positions[6].label}
              name={positions[6].name}
              blurb={blurbs[`D:${positions[6].name}`]?.blurb}
              onClick={() => openProfile(positions[6].name, positions[6].freq)}
            />
            <ProfileCard
              title={positions[5].label}
              name={positions[5].name}
              blurb={blurbs[`D:${positions[5].name}`]?.blurb}
              onClick={() => openProfile(positions[5].name, positions[5].freq)}
            />
          </div>

          {/* Center column: circle + bottom card (Profile 5) */}
          <div className="flex flex-col items-center gap-8">
            <Circle titles={{
              A: groups[0].title, B: groups[1].title, C: groups[2].title, D: groups[3].title
            }} />
            <ProfileCard
              title={positions[4].label}
              name={positions[4].name}
              blurb={blurbs[`C:${positions[4].name}`]?.blurb}
              onClick={() => openProfile(positions[4].name, positions[4].freq)}
            />
          </div>

          {/* Right stack */}
          <div className="grid gap-6">
            <ProfileCard
              title={positions[0].label}
              name={positions[0].name}
              blurb={blurbs[`A:${positions[0].name}`]?.blurb}
              onClick={() => openProfile(positions[0].name, positions[0].freq)}
            />
            <ProfileCard
              title={positions[1].label}
              name={positions[1].name}
              blurb={blurbs[`B:${positions[1].name}`]?.blurb}
              onClick={() => openProfile(positions[1].name, positions[1].freq)}
            />
            <ProfileCard
              title={positions[2].label}
              name={positions[2].name}
              blurb={blurbs[`B:${positions[2].name}`]?.blurb}
              onClick={() => openProfile(positions[2].name, positions[2].freq)}
            />
            <ProfileCard
              title={positions[3].label}
              name={positions[3].name}
              blurb={blurbs[`C:${positions[3].name}`]?.blurb}
              onClick={() => openProfile(positions[3].name, positions[3].freq)}
            />
          </div>
        </div>
      )}
    </main>
  );
}

function ProfileCard({
  title, name, blurb, onClick,
}: {
  title: string; name: string; blurb?: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition shadow-lg p-5 w-[280px]"
    >
      <div className="text-sm text-white/60">{title}</div>
      <div className="text-xl font-semibold mt-1">{name}</div>
      <p className="text-white/80 text-sm mt-3 line-clamp-3">
        {blurb || "Brief AI blurb loading…"}
      </p>
    </button>
  );
}

function Circle({ titles }: { titles: Record<"A"|"B"|"C"|"D", string> }) {
  return (
    <div className="relative w-64 h-64">
      {/* quarters */}
      <Quarter pos="top"    color="#ef4444" label={titles.A} />
      <Quarter pos="right"  color="#f59e0b" label={titles.B} />
      <Quarter pos="bottom" color="#10b981" label={titles.C} />
      <Quarter pos="left"   color="#3b82f6" label={titles.D} />
      {/* crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[3px] h-full bg-white/70 rounded-full" />
        <div className="absolute w-full h-[3px] bg-white/70 rounded-full" />
      </div>
    </div>
  );
}

function Quarter({ pos, color, label }: { pos: "top"|"right"|"bottom"|"left"; color: string; label: string }) {
  const base = "absolute w-1/2 h-1/2 rounded-[24px]";
  const style: Record<typeof pos, React.CSSProperties> = {
    top:    { top: 0,    left: "25%" },
    right:  { top: "25%", right: 0 },
    bottom: { bottom: 0, left: "25%" },
    left:   { top: "25%", left: 0 },
  };
  const caption: Record<typeof pos, React.CSSProperties> = {
    top:    { top: 6, left: "50%", transform: "translateX(-50%)", textAlign: "center" },
    right:  { right: 6, top: "50%", transform: "translateY(-50%)", textAlign: "right" },
    bottom: { bottom: 6, left: "50%", transform: "translateX(-50%)", textAlign: "center" },
    left:   { left: 6, top: "50%", transform: "translateY(-50%)" },
  };
  return (
    <>
      <div className={base} style={{ backgroundColor: color, ...style[pos] }} />
      <div className="absolute text-xs font-semibold text-white drop-shadow" style={caption[pos]}>
        {label}
      </div>
    </>
  );
}
