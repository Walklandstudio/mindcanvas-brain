"use client";

import { useEffect, useMemo, useState } from "react";

type KV = { key: string; value: number; percent?: string };
type Payload = {
  frequencies: KV[];
  profiles: KV[];
  top3: KV[];
  bottom3: KV[];
  overall?: { average?: number; count?: number };
};

type ApiResponse =
  | { ok: true; org: string; testId?: string | null; range?: string; data: Payload }
  | { ok: false; error: string };

export default function PortalDashboardClient({ orgSlug }: { orgSlug: string }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [payload, setPayload] = useState<Payload | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const q = new URLSearchParams();
        q.set("org", orgSlug);

        const res = await fetch(`/api/portal-dashboard?${q.toString()}`, {
          cache: "no-store",
        });

        const j = (await res.json().catch(() => null)) as ApiResponse | null;

        if (!res.ok || !j || (j as any).ok === false) {
          const msg = (j as any)?.error || `Dashboard API failed (HTTP ${res.status})`;
          throw new Error(msg);
        }

        if (alive) setPayload((j as any).data as Payload);
      } catch (e: any) {
        if (alive) setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [orgSlug]);

  const freqs = useMemo(() => payload?.frequencies ?? [], [payload]);
  const profs = useMemo(() => payload?.profiles ?? [], [payload]);
  const top3 = useMemo(() => payload?.top3 ?? [], [payload]);
  const bottom3 = useMemo(() => payload?.bottom3 ?? [], [payload]);
  const overallAvg = payload?.overall?.average ?? null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-300">
          org=<code className="text-slate-100">{orgSlug}</code>
        </p>
      </div>

      {loading && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-slate-200">
          Loading dashboard data…
        </div>
      )}

      {err && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
          Error: {err}
        </div>
      )}

      {!loading && !err && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="font-semibold mb-2 text-slate-100">Overall</h2>
            <div className="text-slate-200">
              {overallAvg == null ? "—" : `Average points: ${overallAvg}`}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="font-semibold mb-4 text-slate-100">Frequencies</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {freqs.map((f) => (
                <div key={f.key} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm text-slate-300">{f.key}</div>
                  <div className="text-xl font-semibold text-white">{f.value}</div>
                  {f.percent ? <div className="text-xs text-slate-400">{f.percent}</div> : null}
                </div>
              ))}
              {!freqs.length && <div className="text-slate-400 text-sm">No frequency data yet.</div>}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="font-semibold mb-4 text-slate-100">Profiles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {profs.map((p) => (
                <div key={p.key} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm text-slate-300">{p.key}</div>
                  <div className="text-xl font-semibold text-white">{p.value}</div>
                  {p.percent ? <div className="text-xs text-slate-400">{p.percent}</div> : null}
                </div>
              ))}
              {!profs.length && <div className="text-slate-400 text-sm">No profile data yet.</div>}
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="font-semibold mb-3 text-slate-100">Top 3 Profiles</h2>
              <div className="space-y-2">
                {top3.map((t) => (
                  <div key={t.key} className="rounded-xl border border-white/10 bg-black/20 p-4 flex justify-between">
                    <span className="text-slate-200">{t.key}</span>
                    <span className="text-white font-semibold">{t.percent ?? String(t.value)}</span>
                  </div>
                ))}
                {!top3.length && <div className="text-slate-400 text-sm">No top 3 yet.</div>}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="font-semibold mb-3 text-slate-100">Bottom 3 Profiles</h2>
              <div className="space-y-2">
                {bottom3.map((b) => (
                  <div key={b.key} className="rounded-xl border border-white/10 bg-black/20 p-4 flex justify-between">
                    <span className="text-slate-200">{b.key}</span>
                    <span className="text-white font-semibold">{b.percent ?? String(b.value)}</span>
                  </div>
                ))}
                {!bottom3.length && <div className="text-slate-400 text-sm">No bottom 3 yet.</div>}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}


