// app/report/[id]/page.tsx
import { headers } from "next/headers";
import ReportViz from "./ReportViz";

export const dynamic = "force-dynamic";

interface ResultPayload {
  profile?: string | null;
  frequency?: string | null;
  total_score?: number;
  scores?: Record<string, unknown> | null;
  raw?: unknown | null;
}
interface ResultAPI {
  source?: string;
  result?: ResultPayload | null;
  error?: string;
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Resolve absolute origin for server fetch
  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "";
  const origin = base || (host ? `${proto}://${host}` : "");

  // Fetch the computed/saved result
  const url = `${origin}/api/submissions/${encodeURIComponent(id)}/result`;

  let payload: ResultAPI | null = null;
  let error: string | null = null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const j = (await res.json()) as ResultAPI;
    if (!res.ok) error = j?.error ?? `HTTP ${res.status}`;
    else payload = j;
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : String(e);
  }

  if (error) {
    return (
      <main className="p-6 max-w-4xl mx-auto space-y-3">
        <h1 className="text-2xl font-semibold">Report</h1>
        <p className="text-sm text-red-600">Failed to load result: {error}</p>
        <p className="text-xs text-gray-500 break-all">Tried: {url}</p>
      </main>
    );
  }

  const src = payload?.source ?? "mc_submissions";
  const r = payload?.result ?? null;

  // Safely extract numeric maps for charts
  let profiles: Record<string, number> | undefined;
  let flows: Record<string, number> | undefined;
  if (r?.scores && typeof r.scores === "object") {
    const s = r.scores as Record<string, unknown>;
    if (s.profiles && typeof s.profiles === "object") {
      profiles = Object.fromEntries(
        Object.entries(s.profiles as Record<string, unknown>).map(([k, v]) => [
          k,
          Number(v) || 0,
        ])
      );
    }
    if (s.flows && typeof s.flows === "object") {
      flows = Object.fromEntries(
        Object.entries(s.flows as Record<string, unknown>).map(([k, v]) => [
          k,
          Number(v) || 0,
        ])
      );
    }
  }

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Report</h1>
      <p className="text-sm text-gray-600">
        Submission: <code>{id}</code> · Source: {src}
      </p>

      {!r ? (
        <p>Result pending.</p>
      ) : (
        <div className="grid gap-6">
          <div className="border rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-2">Summary</h2>
            <p>
              Profile: <strong>{r.profile ?? "—"}</strong>
            </p>
            <p>
              Frequency: <strong>{r.frequency ?? "—"}</strong>
            </p>
            {typeof r.total_score === "number" && (
              <p>
                Total Score: <strong>{r.total_score}</strong>
              </p>
            )}
          </div>

          {/* Charts (pie for flows + primary/aux profiles) */}
          <ReportViz profiles={profiles} flows={flows} />

          {/* Raw scores (optional for debugging) */}
          {r.scores && (
            <div className="border rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-2">Scores (raw)</h2>
              <pre className="text-sm whitespace-pre-wrap">
                {JSON.stringify(r.scores, null, 2)}
              </pre>
            </div>
          )}

          {r.raw !== undefined && r.raw !== null && (
            <details className="border rounded-xl p-4">
              <summary className="cursor-pointer font-medium">Raw</summary>
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(r.raw, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </main>
  );
}

