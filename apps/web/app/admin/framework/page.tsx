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
    frequencies?: Record<"A" | "B" | "C" | "D", string>;
    profiles?: { name: string; frequency: "A" | "B" | "C" | "D" }[];
    A?: { name?: string };
    B?: { name?: string };
    C?: { name?: string };
    D?: { name?: string };
  };
};

type Group = {
  f: "A" | "B" | "C" | "D";
  title: string;
  color: string;
  profiles: string[];
};

type Blurb = { key: string; name: string; frequency: "A" | "B" | "C" | "D"; blurb: string };

export default function FrameworkPage() {
  const [orgId, setOrgId] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [fw, setFw] = useState<FrameworkRecord | null>(null);
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [blurbs, setBlurbs] = useState<Record<string, Blurb>>({});
  const [goals, setGoals] = useState<any>({});

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

        const fm = record.frequency_meta || {};
        const frequencies =
          fm.frequencies || {
            A: fm.A?.name || "A",
            B: fm.B?.name || "B",
            C: fm.C?.name || "C",
            D: fm.D?.name || "D",
          };
        const profiles: { name: string; frequency: "A" | "B" | "C" | "D" }[] = fm.profiles || [];
        const gs: Group[] = (["A", "B", "C", "D"] as const).map((f) => ({
          f,
          title: frequencies[f],
          color: COLORS[f],
          profiles: profiles.filter((p) => p.frequency === f).map((p) => p.name),
        }));
        setGroups(gs);

        if (profiles.length > 0) {
          const bRes = await fetch("/api/admin/profiles/blurbs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              company: "Your Organization",
              goals: g,
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

  const orderedCards = useMemo(() => {
    if (!groups) return null;
    const a = groups[0]?.profiles || [];
    const b = groups[1]?.profiles || [];
    const c = groups[2]?.profiles || [];
    const d = groups[3]?.profiles || [];
    return [
      { slot: "R1", label: "Profile 1", name: a[0] || "Profile 1", freq: "A" as const },
      { slot: "R2", label: "Profile 2", name: b[0] || "Profile 2", freq: "B" as const },
      { slot: "R3", label: "Profile 3", name: b[1] || "Profile 3", freq: "B" as const },
      { slot: "R4", label: "Profile 4", name: c[0] || "Profile 4", freq: "C" as const },
      { slot: "L1", label: "Profile 8", name: a[1] || "Profile 8", freq: "A" as const },
      { slot: "L2", label: "Profile 7", name: d[1] || "Profile 7", freq: "D" as const },
      { slot: "L3", label: "Profile 6", name: d[0] || "Profile 6", freq: "D" as const },
      { slot: "L4", label: "Profile 5", name: c[1] || "Profile 5", freq: "C" as const },
    ];
  }, [groups]);

  function openProfile(name: string, frequency: "A" | "B" | "C" | "D") {
    const q = new URLSearchParams({ name, frequency, orgId, ...(goals || {}) }).toString();
    window.location.href = `/admin/profiles/edit?${q}`;
  }

  return (
    <main className="max-w-[1240px] mx-auto p-8 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Framework</h1>
          <p className="text-white/60">
            Auto-generated from onboarding. Click a card to edit the profile’s report.
          </p>
        </div>

        {/* Added CTA */}
        <div className="flex items-center gap-3">
          <a
            href="/admin/test-builder"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 font-medium text-black shadow"
          >
            Test Builder
          </a>
          <div className="text-white/60 text-sm">{fw?.name || "Signature — Core Framework"}</div>
        </div>
      </div>

      {loading && <p className="mt-6 text-white/70">Loading…</p>}
      {err && <div className="mt-6 p-3 rounded-lg bg-red-500/20 border border-red-400/40 text-red-100 text-sm">{err}</div>}

      {!loading && !err && groups && orderedCards && (
        <div className="mt-8 grid grid-cols-[300px_1fr_300px] gap-10 items-start">
          <div className="grid gap-6">
            {orderedCards.filter((c)=>c.slot.startsWith("L")).map((c)=>(
              <ProfileCard key={c.slot} title={c.label} name={c.name}
                blurb={blurbs[`${c.freq}:${c.name}`]?.blurb}
                onClick={()=>openProfile(c.name, c.freq)} />
            ))}
          </div>

          <div className="flex items-start justify-center">
            <Circle titles={{
              A: groups[0].title, B: groups[1].title, C: groups[2].title, D: groups[3].title
            }} />
          </div>

          <div className="grid gap-6">
            {orderedCards.filter((c)=>c.slot.startsWith("R")).map((c)=>(
              <ProfileCard key={c.slot} title={c.label} name={c.name}
                blurb={blurbs[`${c.freq}:${c.name}`]?.blurb}
                onClick={()=>openProfile(c.name, c.freq)} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function ProfileCard({
  title, name, blurb, onClick,
}: { title: string; name: string; blurb?: string; onClick: () => void; }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition shadow-lg p-5 w-[300px]"
    >
      <div className="text-sm text-white/60">{title}</div>
      <div className="text-xl font-semibold mt-1">{name}</div>
      <p className="text-white/80 text-sm mt-3 line-clamp-3">{blurb || "Brief AI blurb loading…"}</p>
    </button>
  );
}

function Circle({ titles }: { titles: Record<"A" | "B" | "C" | "D", string> }) {
  const size = 320; const r = size / 2; const pad = 14; const innerR = r - pad;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Frequency circle" className="drop-shadow-xl">
      <circle cx={r} cy={r} r={r} fill="#0b1620" />
      <path d={arcPath(r, r, innerR, -90, 0)} fill={COLORS.A} />
      <path d={arcPath(r, r, innerR, 0, 90)} fill={COLORS.B} />
      <path d={arcPath(r, r, innerR, 90, 180)} fill={COLORS.C} />
      <path d={arcPath(r, r, innerR, 180, 270)} fill={COLORS.D} />
      <line x1={r} y1={pad} x2={r} y2={size - pad} stroke="white" strokeWidth={3} opacity={0.8} />
      <line x1={pad} y1={r} x2={size - pad} y2={r} stroke="white" strokeWidth={3} opacity={0.8} />
      <text x={r} y={pad + 16} textAnchor="middle" fill="white" fontWeight="700" fontSize="14">{titles.A}</text>
      <text x={size - pad - 6} y={r + 5} textAnchor="end" fill="white" fontWeight="700" fontSize="14">{titles.B}</text>
      <text x={r} y={size - pad - 6} textAnchor="middle" fill="white" fontWeight="700" fontSize="14">{titles.C}</text>
      <text x={pad + 6} y={r + 5} textAnchor="start" fill="white" fontWeight="700" fontSize="14">{titles.D}</text>
    </svg>
  );
}
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const s = toRad(startDeg); const e = toRad(endDeg);
  const x1 = cx + r * Math.cos(s); const y1 = cy + r * Math.sin(s);
  const x2 = cx + r * Math.cos(e); const y2 = cy + r * Math.sin(e);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return [`M ${cx} ${cy}`, `L ${x1} ${y1}`, `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`, "Z"].join(" ");
}
