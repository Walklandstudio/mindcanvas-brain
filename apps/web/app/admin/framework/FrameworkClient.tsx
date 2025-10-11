// apps/web/app/admin/framework/FrameworkClient.tsx
"use client";

import Link from "next/link";
import { useState } from "react";

type F = "A" | "B" | "C" | "D";
type FrequencyMeta = Record<F, { name?: string; image_url?: string; image_prompt?: string }>;
type Profile = {
  id: string;
  name: string;
  frequency: F;
  ordinal: number;
  image_url?: string | null;
  summary?: string | null;
  strengths?: string[] | null;
};

export default function FrameworkClient({
  frequencyMeta,
  profiles,
}: {
  frequencyMeta: FrequencyMeta;
  profiles: Profile[];
}) {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function notify(s: string) {
    setToast(s);
    setTimeout(() => setToast(null), 3000);
  }

  const ready = (profiles?.length || 0) >= 8;

  async function generateImages() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/framework/generate-images", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Image generation failed");
      notify("Images generated");
      // refresh
      location.reload();
    } catch (e: any) {
      notify(e?.message || "Image generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Frequencies row */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Frequencies</h2>
        <button
          onClick={generateImages}
          disabled={busy}
          className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 hover:bg-white/15 disabled:opacity-50 text-sm"
        >
          {busy ? "Generating…" : "Generate Images"}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {(["A", "B", "C", "D"] as F[]).map((F) => {
          const title = frequencyMeta?.[F]?.name || `Frequency ${F}`;
          const img = frequencyMeta?.[F]?.image_url || null;
          return (
            <section key={F} className="border border-white/10 rounded-2xl p-4 bg-white/5">
              <div className="flex items-center gap-3">
                {img ? (
                  <img src={img} alt={title} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-white/10 grid place-items-center text-sm">{F}</div>
                )}
                <h2 className="text-lg font-semibold">{title}</h2>
              </div>
            </section>
          );
        })}
      </div>

      {/* Profiles grid */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-3">Recommended Profiles</h3>
        {!profiles?.length ? (
          <div className="text-white/60 text-sm">Preparing profiles… reload in a moment.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {profiles
              .slice()
              .sort((a, b) => a.ordinal - b.ordinal)
              .map((p) => (
                <article key={p.id} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-start gap-3">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white/10 grid place-items-center text-sm">
                        {p.frequency}
                      </div>
                    )}
                    <div>
                      <div className="text-base font-semibold">{p.name}</div>
                      <div className="text-xs text-white/60">Frequency {p.frequency}</div>
                    </div>
                  </div>
                  {p.summary && <p className="text-white/85 mt-3 text-sm">{p.summary}</p>}
                  {Array.isArray(p.strengths) && p.strengths.length > 0 && (
                    <ul className="mt-3 text-sm list-disc list-inside text-white/85">
                      {p.strengths.slice(0, 4).map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
          </div>
        )}
      </div>

      {/* Next step CTA */}
      <div className="mt-10 flex items-center justify-between">
        <div className="text-white/70 text-sm">
          {ready
            ? "Looks good? Proceed to build and brand the test."
            : "You’ll be able to continue once the 8 profiles are ready."}
        </div>
        {ready ? (
          <Link
            href="/admin/test-builder"
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-medium"
          >
            Start Test Builder →
          </Link>
        ) : (
          <button
            disabled
            className="px-4 py-2 rounded-xl bg-white/10 text-white/40 border border-white/15 cursor-not-allowed"
          >
            Start Test Builder
          </button>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-white/10 border border-white/15">
          {toast}
        </div>
      )}
    </div>
  );
}
