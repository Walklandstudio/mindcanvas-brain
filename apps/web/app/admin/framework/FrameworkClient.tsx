"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  name: string;
  frequency: "A" | "B" | "C" | "D";
  image_url: string | null;
  ordinal: number | null;
};

function Toast({ text, type }: { text: string; type: "success" | "error" }) {
  return (
    <div
      className={[
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-2 shadow-lg",
        type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white",
      ].join(" ")}
    >
      {text}
    </div>
  );
}

export default function FrameworkClient(props: {
  orgId: string | null;
  frameworkId: string | null;
  initialProfiles: Profile[];
  initialFrequencies: Record<"A" | "B" | "C" | "D", string> | null;
}) {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>(props.initialProfiles);
  const [freqNames, setFreqNames] = useState(props.initialFrequencies);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [busy, setBusy] = useState(false);

  // Auto-seed if org exists but has 0 profiles (or if orgId is null; reseed will set cookie)
  useEffect(() => {
    if (profiles.length === 0) {
      (async () => {
        setBusy(true);
        try {
          const res = await fetch("/api/admin/framework/reseed", { method: "POST" });
          if (!res.ok) throw new Error(await res.text());
          setToast({ text: "Framework seeded successfully", type: "success" });
          router.refresh();
        } catch (e: any) {
          setToast({ text: e?.message || "Failed to seed framework", type: "error" });
        } finally {
          setBusy(false);
          setTimeout(() => setToast(null), 2500);
        }
      })();
    }
  }, [profiles.length, router]);

  const grouped = useMemo(() => {
    const byFreq: Record<"A" | "B" | "C" | "D", Profile[]> = { A: [], B: [], C: [], D: [] };
    for (const p of profiles) byFreq[p.frequency]?.push(p);
    (Object.keys(byFreq) as Array<keyof typeof byFreq>).forEach((k) => byFreq[k].sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0)));
    return byFreq;
  }, [profiles]);

  async function saveProfile(id: string, patch: Partial<Profile>) {
    try {
      const res = await fetch(`/api/admin/profiles/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await res.text());
      setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      setToast({ text: "Saved", type: "success" });
    } catch (e: any) {
      setToast({ text: e?.message || "Save failed", type: "error" });
    } finally {
      setTimeout(() => setToast(null), 2000);
    }
  }

  function FreqColumn({ code }: { code: "A" | "B" | "C" | "D" }) {
    const pretty = freqNames?.[code] ?? code;
    return (
      <div className="space-y-3">
        <div className="text-sm font-semibold text-white/90">
          {code} — {pretty}
        </div>
        <div className="grid gap-3">
          {(grouped[code] ?? []).map((p) => (
            <div key={p.id} className="mc-card p-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.image_url ? <img src={p.image_url} alt={p.name} className="object-cover h-12 w-12" /> : <span className="text-white/40 text-xs">no image</span>}
                </div>
                <input
                  className="mc-input max-w-xs"
                  defaultValue={p.name}
                  onBlur={(e) => {
                    const v = e.currentTarget.value.trim();
                    if (v && v !== p.name) saveProfile(p.id, { name: v });
                  }}
                />
                <input
                  className="mc-input"
                  placeholder="Image URL"
                  defaultValue={p.image_url ?? ""}
                  onBlur={(e) => {
                    const v = e.currentTarget.value.trim();
                    if (v !== (p.image_url ?? "")) saveProfile(p.id, { image_url: v || null });
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Framework</h1>
          <p className="text-white/60 text-sm">
            {profiles.length ? "Edit profile names and images." : "Preparing a default framework for your org…"}
          </p>
        </div>
        <div className="text-sm text-white/60">{busy ? "Seeding…" : null}</div>
      </div>

      {/* Grid A/B/C/D */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FreqColumn code="A" />
        <FreqColumn code="B" />
        <FreqColumn code="C" />
        <FreqColumn code="D" />
      </div>

      {toast && <Toast text={toast.text} type={toast.type} />}
    </div>
  );
}
