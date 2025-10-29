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
  // Your API currently returns a flat object like:
  // { "PROFILE_1": 40, "PROFILE_3": 150, ... }
  totals?: Record<string, number> & {
    // optional shapes in other builds:
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
  // Some Next typings have headers() as Promise-like; await for safety
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

function mapProfileName(profileCodeLike: string | null | undefined, meta?: MetaRes) {
  const key = codeToProfileKey(profileCodeLike);
  if (!key) return profileCodeLike || "—";
  const found = meta?.profiles?.find((p) => String(p.code) === String(key));
  return found?.name || `Profile ${key}`;
}

function mapFrequencyName(freqCodeLike: string | null | undefined, meta?: MetaRes) {
  if (!freqCodeLike) return "—";
  const found = meta?.frequencies?.find((f) => f.code === freqCodeLike);
  return found?.name || `Frequency ${freqCodeLike}`;
}

function takerDisplayName(t?: ResultRes["taker"]) {
  const first = (t?.first_name || "").trim();
  const last = (t?.last_name || "").trim();
  const full = [first, last].filter(Boolean).join(" ");
  return full || t?.email || "there";
}

/** Extracts a normalized profile_totals map from whatever the API returned. */
function getProfileTotals(totals?: ResultRes["totals"]) {
  if (!totals) return null;

  // Prefer an explicit nested map if present
  const nested = (totals as any).profile_totals as Record<string, number> | undefined;
  if (nested && typeof nested === "object") return nested;

  // Otherwise, detect flat keys like "PROFILE_1", "P1", or "1"
  const entries = Object.entries(totals).filter(([k, v]) => typeof v === "number");
  const profileEntries = entries.filter(([k]) => /^(profile[_\s-]?|p)?\d+$/i.test(k) || /^PROFILE_\d+$/i.test(k));
  if (profileEntries.length === 0) return null;

  // Build a normalized map with numeric profile keys as strings ("1".."8")
  const normalized: Record<string, number> = {};
  for (const [k, v] of profileEntries) {
    const key = codeToProfileKey(k) ?? k;
    normalized[String(key)] = v as number;
  }
  return normalized;
}

/** Pick top profile code (numeric string) from totals */
function getTopProfileCodeFromTotals(profileTotals: Record<string, number> | null) {
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

  // 1) Normalize totals
  const profileTotals = getProfileTotals(result.totals);

  // 2) Determine top profile
  // If API ever provides profile_code, prefer that:
  const apiProfileCode =
    (result.totals?.profile_code && codeToProfileKey(result.totals?.profile_code)) || null;
  const computedTopProfileCode = getTopProfileCodeFromTotals(profileTotals);
  const topProfileCode = apiProfileCode || computedTopProfileCode || null;

  // 3) Map names
  const topProfileName = topProfileCode ? mapProfileName(topProfileCode, meta || undefined) : "—";

  // 4) Dominant frequency:
  // Prefer explicit frequency_code if ever present; else infer from top profile mapping in meta.profiles
  const apiFreqCode = (result.totals?.frequency_code as string | null) || null;
  let inferredFreqCode: string | null = null;
  if (!apiFreqCode && topProfileCode && meta?.profiles) {
    const p = meta.profiles.find((x) => String(x.code) === String(topProfileCode));
    inferredFreqCode = p?.frequency ?? null;
  }
  const freqCode = apiFreqCode || inferredFreqCode || null;
  const topFrequencyName = mapFrequencyName(freqCode, meta || undefined);

  // 5) Optional frequency_totals if ever present
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
              Score: {profileTotals[String(topProfileCode)] ?? "—"}
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

