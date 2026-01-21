// apps/web/app/portal/[slug]/dashboard/PortalDashboardClient.tsx
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

        const j = (await res.json()) as ApiResponse;

        if (!res.ok || !j || (j as any).ok === false) {
          const msg =
            (j as any)?.error || `HTTP ${res.status}`;
          throw new Error(msg);
        }

        if (alive) setPayload((j as any).data);
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
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-sm text-gray-600">
        org=<code>{orgSlug}</code>
      </p>

      {loading && <div className="text-gray-600">Loading…</div>}
      {err && <div className="text-red-600">Error: {err}</div>}

      {!loading && !err && (
        <div className="space-y-6">
          <section>
            <h2 className="font-semibold mb-2">Overall</h2>
            <div className="rounded border p-4 bg-white">
              {overallAvg == null ? "—" : `Average points: ${overallAvg}`}
            </div>
          </section>

          <section>
            <h2 className="font-semibold mb-2">Frequencies</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {freqs.map((f) => (
                <div key={f.key} className="rounded border p-3 bg-white">
                  <div className="text-sm text-gray-600">{f.key}</div>
                  <div className="text-xl font-semibold">{f.value}</div>
                  {f.percent ? (
                    <div className="text-xs text-gray-500">{f.percent}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-semibold mb-2">Profiles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {profs.map((p) => (
                <div key={p.key} className="rounded border p-3 bg-white">
                  <div className="text-sm text-gray-600">{p.key}</div>
                  <div className="text-xl font-semibold">{p.value}</div>
                  {p.percent ? (
                    <div className="text-xs text-gray-500">{p.percent}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h2 className="font-semibold mb-2">Top 3 Profiles</h2>
              <div className="space-y-2">
                {top3.map((t) => (
                  <div key={t.key} className="rounded border p-3 bg-white">
                    <div className="text-sm text-gray-600">{t.key}</div>
                    <div className="text-xl font-semibold">{t.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="font-semibold mb-2">Bottom 3 Profiles</h2>
              <div className="space-y-2">
                {bottom3.map((t) => (
                  <div key={t.key} className="rounded border p-3 bg-white">
                    <div className="text-sm text-gray-600">{t.key}</div>
                    <div className="text-xl font-semibold">{t.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

