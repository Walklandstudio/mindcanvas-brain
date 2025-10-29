/* apps/web/app/t/[token]/result/page.tsx */
export const dynamic = "force-dynamic";

import { headers } from "next/headers";

type MetaRes = {
  ok: boolean;
  test_id: string;
  org_id: string;
  frequencies: { code: string; name: string }[];
  profiles: { code: string; name: string; frequency: string }[];
  thresholds: any[];
  error?: string;
};

type ResultRes = {
  ok: boolean;
  taker?: {
    id: string;
    test_id: string;
    org_id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    created_at: string;
  };
  totals?: {
    total_points?: number | null;
    frequency_code?: string | null;
    profile_code?: string | null;
    frequency_totals?: Record<string, number> | null;
    profile_totals?: Record<string, number> | null;
  };
  raw?: any;
  error?: string;
};

async function getBaseUrl() {
  // In your setup, headers() is async -> Promise<ReadonlyHeaders>
  const h = await (headers() as unknown as Promise<Readonly<Headers>>);
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

async function fetchJSON<T>(path: string): Promise<T> {
  const base = await getBaseUrl();
  const res = await fetch(`${base}${path}`, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${path} – ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

function codeToProfileKey(code?: string | null) {
  if (!code) return null;
  const m = String(code).match(/(\d+)/);
  return m ? m[1] : null;
}

function mapProfileName(code: string | null | undefined, meta?: MetaRes) {
  const key = codeToProfileKey(code);
  if (!key) return code || "—";
  const found = meta?.profiles?.find((p) => String(p.code) === String(key));
  return found?.name || `Profile ${key}`;
}

function mapFrequencyName(code: string | null | undefined, meta?: MetaRes) {
  if (!code) return "—";
  const found = meta?.frequencies?.find((f) => f.code === code);
  return found?.name || `Frequency ${code}`;
}

function takerDisplayName(t?: ResultRes["taker"]) {
  const first = t?.first_name?.trim() || "";
  const last = t?.last_name?.trim() || "";
  const full = [first, last].filter(Boolean).join(" ");
  return full || t?.email || "there";
}

export default async function ResultPage({ params }: { params: { token: string } }) {
  const { token } = params;

  let result: ResultRes | null = null;
  let meta: MetaRes | null = null;
  let loadError: string | null = null;

  try {
    const [r, m] = await Promise.all([
      fetchJSON<ResultRes>(`/api/public/test/${token}/result`),
      fetchJSON<MetaRes>(`/api/public/test/${token}/meta`),
    ]);
    result = r;
    meta = m;
  } catch (e: any) {
    loadError = e?.message || "Failed to load report data.";
  }

  if (loadError) {
    return (
      <main className="max-w-3xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Your Report</h1>
        <div className="border border-red-200 rounded-xl p-4 bg-red-50 text-red-700">
          Application error while loading this report.
          <div className="mt-2 text-sm">{loadError}</div>
        </div>
      </main>
    );
  }

  if (!result?.ok) {
    return (
      <main className="max-w-3xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Your Report</h1>
        <div className="text-red-600">
          {result?.error ? `Unable to load result: ${result.error}` : "Unable to load result."}
        </div>
      </main>
    );
  }

  const takerName = takerDisplayName(result.taker);
  const topProfileCode = result.totals?.profile_code ?? null;
  const topFrequencyCode = result.totals?.frequency_code ?? null;
  const totalScore = result.totals?.total_points ?? null;

  const topProfileName = mapProfileName(topProfileCode, meta || undefined);
  const topFrequencyName = mapFrequencyName(topFrequencyCode, meta || undefined);

  const freqTotals = result.totals?.frequency_totals || null;
  const profTotals = result.totals?.profile_totals || null;

  const normalizedProfileTotals =
    profTotals &&
    Object.fromEntries(
      Object.entries(profTotals).map(([k, v]) => {
        const key = codeToProfileKey(k) ?? k;
        return [key, v as number];
      })
    );

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Your Report</h1>
        <p className="text-gray-600">
          Hi {takerName}!{" "}
          <span className="text-gray-400">
            Status: {result.taker ? "completed" : "pending"}
          </span>
        </p>
      </header>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="border rounded-xl p-4 space-y-2">
          <div className="text-sm text-gray-500">Top Profile</div>
          <div className="text-xl font-semibold">{topProfileName}</div>
          {totalScore !== null && (
            <div className="text-sm text-gray-500">Score: {totalScore}</div>
          )}
        </div>

        <div className="border rounded-xl p-4 space-y-2">
          <div className="text-sm text-gray-500">Dominant Frequency</div>
          <div className="text-xl font-semibold">{topFrequencyName}</div>

          {freqTotals && Object.values(freqTotals).some((n) => Number(n) > 0) && (
            <div className="text-xs text-gray-500">
              {["A", "B", "C", "D"].map((c, i) => {
                const n = (freqTotals as any)[c] ?? 0;
                return (
                  <span key={c}>
                    {c}:{n}
                    {i < 3 ? " · " : ""}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {normalizedProfileTotals &&
        Object.keys(normalizedProfileTotals).length > 0 && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Profile Scores</h2>
            <div className="border rounded-xl overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left">
                    <th className="p-3">Profile</th>
                    <th className="p-3">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(normalizedProfileTotals)
                    .sort((a, b) => Number(b[1]) - Number(a[1]))
                    .map(([k, v]) => (
                      <tr key={k} className="border-t">
                        <td className="p-3">{mapProfileName(k, meta || undefined)}</td>
                        <td className="p-3">{v as number}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

      <details className="border rounded-xl p-4">
        <summary className="cursor-pointer select-none">Debug JSON</summary>
        <pre className="text-xs overflow-auto p-2 bg-gray-50 rounded">
{JSON.stringify({ result, meta }, null, 2)}
        </pre>
      </details>
    </main>
  );
}

