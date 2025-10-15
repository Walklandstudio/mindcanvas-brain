"use client";

import { useEffect, useMemo, useState } from "react";

const COLORS = {
  A: "#ef4444", // red
  B: "#f59e0b", // yellow
  C: "#10b981", // green
  D: "#3b82f6", // blue
};

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
  const [orgId, setOrgId] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [fw, setFw] = useState<FrameworkRecord | null>(null);
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    const fromStorage =
      (typeof window !== "undefined" && localStorage.getItem("mc_org_id")) || "";
    const fromUrl =
      (typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("orgId")) || "";
    const val = (fromStorage || fromUrl || "").replace(/^:/, "").trim();
    setOrgId(val);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const gRes = await fetch("/api/onboarding/get?step=goals", { cache: "no-store" });
        const g = (await gRes.json().catch(() => ({})))?.data || {};

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
        if (!res.ok) throw new Error(j?.error || "Failed to generate/load framework");
        setNote(j?.note || "");

        const record = (j.framework || j.preview) as FrameworkRecord;
        if (mounted) setFw(record || null);
      } catch (e: any) {
        if (mounted) setErr(e?.message || "Failed to load framework");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [orgId]);

  const groups = useMemo(() => {
    if (!fw?.frequency_meta) return null;

    const fm = fw.frequency_meta;
    const frequencies =
      fm.frequencies ||
      { A: fm?.A?.name || "A", B: fm?.B?.name || "B", C: fm?.C?.name || "C", D: fm?.D?.name || "D" };

    const profiles: { name: string; frequency: "A" | "B" | "C" | "D" }[] =
      fm.profiles || [];

    return (["A", "B", "C", "D"] as const).map((f) => ({
      f,
      title: frequencies[f],
      color: COLORS[f],
      profiles: profiles
        .filter((p) => p.frequency === f)
        .map((p) => p.name),
    }));
  }, [fw]);

  return (
    <main className="max-w-4xl mx-auto p-6 text-white">
      <h1 className="text-2xl font-semibold">Framework</h1>
      <p className="text-white/70 mt-1">Auto-generated from your onboarding. No action needed here.</p>

      {loading && <p className="mt-4 text-white/70">Generating…</p>}
      {err && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/20 border border-red-400/40 text-red-100 text-sm">
          {err}
        </div>
      )}

      {!loading && !err && fw && groups && (
        <>
          <div className="text-white/70 text-sm mt-3">{fw.name}</div>

          {/* Circle */}
          <div className="relative mx-auto mt-6 w-72 h-72 rounded-full border border-white/20">
            <div className="absolute inset-8 rounded-full border border-white/10" />
            <FreqLabel pos="top" label={groups[0].title} color={groups[0].color} />
            <FreqLabel pos="right" label={groups[1].title} color={groups[1].color} />
            <FreqLabel pos="bottom" label={groups[2].title} color={groups[2].color} />
            <FreqLabel pos="left" label={groups[3].title} color={groups[3].color} />
          </div>

          {/* Lists */}
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            {groups.map((g) => (
              <div key={g.f} className="rounded-lg border border-white/10 p-4">
                <div className="text-sm text-white/60">Frequency {g.f}</div>
                <div className="text-lg font-semibold" style={{ color: g.color }}>
                  {g.title}
                </div>
                <ul className="mt-3 list-disc pl-5">
                  {g.profiles.length === 0 && (
                    <li className="text-white/60">No profiles provided</li>
                  )}
                  {g.profiles.map((name: string, i: number) => (
                    <li key={i}>{name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {note && <p className="mt-4 text-xs text-white/50">Note: {note}</p>}
          <p className="mt-6 text-xs text-white/50">
            orgId: <code>{orgId || "(not set — preview mode)"} </code>
          </p>
        </>
      )}
    </main>
  );
}

function FreqLabel({
  pos,
  label,
  color,
}: {
  pos: "top" | "right" | "bottom" | "left";
  label: string;
  color: string;
}) {
  const stylePos: Record<string, React.CSSProperties> = {
    top: { top: 0, left: "50%", transform: "translate(-50%, -50%)" },
    right: { right: 0, top: "50%", transform: "translate(50%, -50%)" },
    bottom: { bottom: 0, left: "50%", transform: "translate(-50%, 50%)" },
    left: { left: 0, top: "50%", transform: "translate(-50%, -50%)" },
  };
  return (
    <span
      className="absolute px-3 py-1 rounded-full text-sm font-medium shadow"
      style={{ backgroundColor: color, ...stylePos[pos] }}
    >
      {label || "—"}
    </span>
  );
}
