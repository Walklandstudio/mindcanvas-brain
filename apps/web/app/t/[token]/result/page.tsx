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
    test_id?: string;
    org_id?: string;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    created_at?: string;
    status?: string;
  };
  totals?: Record<string, number> & {
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

function extractDigits(s?: string | null) {
  if (!s) return null;
  const m = String(s).match(/(\d+)/);
  return m ? m[1] : null;
}

function findProfileByCode(codeLike: string | null | undefined, meta?: MetaRes) {
  if (!codeLike || !meta?.profiles) return null;
  // 1) exact match (PROFILE_3 etc.)
  const exact = meta.profiles.find((p) => p.code === codeLike);
  if (exact) return exact;
  // 2) numeric match (e.g., "3" vs "PROFILE_3")
  const num = extractDigits(codeLike);
  if (num) {
    const byNum = meta.profiles.find((p) => extractDigits(p.code) === num);
    if (byNum) return byNum;
  }
  return null;
}

function mapProfileName(codeLike: string | null | undefined, meta?: MetaRes) {
  const p = findProfileByCode(codeLike, meta);
  if (p) return p.name;
  // fallback: "Profile N" if digits exist; else raw
  const n = extractDigits(codeLike);
  return n ? `Profile ${n}` : (codeLike || "—");
}

function mapFrequencyName(freqCode: string | null | undefined, meta?: MetaRes) {
  if (!freqCode) return "—";
  const found = meta?.frequencies?.find((f) => f.code === freqCode);
  return found?.name || `Frequency ${freqCode}`;
}

function takerDisplayName(t?: ResultRes["taker"]) {
  const first = (t?.first_name || "").trim();
  const last = (t?.last_name || "").trim();
  const full = [first, last].filter(Boolean).join(" ");
  return full || t?.email || "there";
}

function getProfileTotals(totals?: ResultRes["totals"]) {
  if (!totals) return null;

  // Prefer nested map if present
  const nested = (totals as any).profile_totals as Record<string, number> | undefined;
  if (nested && typeof nested === "object") return nested;

  // Otherwise detect flat profile keys (PROFILE_1, P1, 1)
  const entries = Object.entries(totals).filter(([_, v]) => typeof v === "number");
  const profileEntries = entries.filter(([k]) => /^(PROFILE_\d+|P\d+|\d+)$/.test(k));
  if (profileEntries.length === 0) return null;

  // Keep the original keys (e.g., PROFILE_3) so we can exact-match names later
  return Object.fromEntries(profileEntries) as Record<string, number>;
}

function getTopProfileCode(profileTotals: Record<string, number> | null) {
  if (!profileTotals) return null;
  let top: { code: string; val: number } | null = null;
  for (const [code, val] of Object.entries(profileTotals)) {
    const n = Number(val) || 0;
    if (!top || n > top.val) top = { code, val: n };
  }
  return top?.code ?? null;
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

  // Normalize totals and compute top profile
  const profileTotals = getProfileTotals(result.totals);
  const apiProfileCode =
    (result.totals?.profile_code as string | null | undefined) ?? null;
  const topProfileCode = apiProfileCode || getTopProfileCode(profileTotals);

  // Map names
  const topProfile = topProfileCode ? findProfileByCode(topProfileCode, meta || undefined) : null;
  const topProfileName = topProfile ? topProfile.name : mapProfileName(topProfileCode, meta || undefined);

  // Dominant frequency:
  const apiFreqCode = (result.totals?.frequency_code as string | null) || null;
  const inferredFreqCode =
    (!apiFreqCode && topProfile) ? topProfile.frequency : null;
  const freqCode = apiFreqCode || inferredFreqCode || null;
  const topFrequencyName = mapFrequencyName(freqCode, meta || undefined);

  const freqTotals = (result.totals as any)?.frequency_totals as Record<string, number> | null;

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Your Report</h1>
        <p className="text-gray-600">
          Hi {takerName}!{" "}
          <span className="text-gray-400">
            Status: {result.taker?.status ?? (result.taker ? "completed" : "pending")}
          </span>
        </p>
      </header>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="border rounded-xl p-4 space-y-2">
          <div className="text-sm text-gray-500">Top Profile</div>
          <div className="text-xl font-semibold">{topProfileName}</div>
          {topProfileCode && profileTotals && (
            <div className="text-sm text-gray-500">
              Score: {profileTotals[topProfileCode] ?? "—"}
            </div>
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

      {profileTotals && Object.keys(profileTotals).length > 0 && (
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
                {Object.entries(profileTotals)
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

