/* apps/web/app/t/[token]/result/page.tsx */
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Report",
};

type MetaRes = {
  ok: boolean;
  test_id: string;
  org_id: string;
  frequencies: { code: string; name: string }[];
  profiles: { code: string; name: string; frequency: string }[];
  thresholds: any[];
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
    // Optional fields other builds sometimes include:
    frequency_totals?: Record<string, number> | null;
    profile_totals?: Record<string, number> | null;
  };
  raw?: any;
  error?: string;
};

function codeToProfileKey(code?: string | null) {
  if (!code) return null;
  // Accept "PROFILE_1" | "P1" | "1"
  const m = String(code).match(/(\d+)/);
  return m ? m[1] : null;
}

function mapProfileName(code: string | null | undefined, meta?: MetaRes) {
  const key = codeToProfileKey(code);
  if (!key) return code || "—";
  const found = meta?.profiles?.find((p) => String(p.code) === String(key));
  if (found?.name) return found.name;
  // Fallback
  return `Profile ${key}`;
}

function mapFrequencyName(code: string | null | undefined, meta?: MetaRes) {
  if (!code) return "—";
  const found = meta?.frequencies?.find((f) => f.code === code);
  return found?.name || `Frequency ${code}`;
}

function displayName(taker?: ResultRes["taker"]) {
  const first = taker?.first_name?.trim() || "";
  const last = taker?.last_name?.trim() || "";
  const full = [first, last].filter(Boolean).join(" ");
  return full || taker?.email || "there";
}

async function fetchJSON<T = any>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} while fetching ${url}`);
  }
  return (await res.json()) as T;
}

export default async function ResultPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;

  // Load result and meta in parallel
  const [result, meta] = await Promise.all([
    fetchJSON<ResultRes>(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/public/test/${token}/result`).catch(
      async () => await fetchJSON<ResultRes>(`/api/public/test/${token}/result`)
    ),
    fetchJSON<MetaRes>(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/public/test/${token}/meta`).catch(
      async () => await fetchJSON<MetaRes>(`/api/public/test/${token}/meta`)
    ),
  ]);

  if (!result?.ok) {
    return (
      <main className="max-w-3xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Your Report</h1>
        <div className="text-red-600">Unable to load result{result?.error ? `: ${result.error}` : ""}</div>
      </main>
    );
  }

  const takerName = displayName(result.taker);
  const topProfileCode = result.totals?.profile_code ?? null;
  const topFrequencyCode = result.totals?.frequency_code ?? null;
  const totalScore = result.totals?.total_points ?? null;

  const topProfileName = mapProfileName(topProfileCode, meta);
  const topFrequencyName = mapFrequencyName(topFrequencyCode, meta);

  // Optional breakdowns if your DB provides them:
  const freqTotals = result.totals?.frequency_totals || null;
  const profTotals = result.totals?.profile_totals || null;

  // Normalize profile_totals keys like "PROFILE_1" | "P1" | "1"
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

          {/* Only show A/B/C/D row if non-zero totals exist */}
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

      {/* Optional: Profile scores table if provided */}
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
                        <td className="p-3">
                          {mapProfileName(k, meta)}
                        </td>
                        <td className="p-3">{v as number}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

      {/* Debug block can be toggled off when you’re happy */}
      <details className="border rounded-xl p-4">
        <summary className="cursor-pointer select-none">Debug JSON</summary>
        <pre className="text-xs overflow-auto p-2 bg-gray-50 rounded">
{JSON.stringify({ result, meta }, null, 2)}
        </pre>
      </details>
    </main>
  );
}

