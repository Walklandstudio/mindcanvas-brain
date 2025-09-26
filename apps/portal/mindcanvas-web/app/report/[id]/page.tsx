// app/report/[id]/page.tsx
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

type Scores = Record<string, unknown> | null;

interface ResultPayload {
  profile?: string | null;
  frequency?: string | null;
  total_score?: number;
  scores?: Scores;
  raw?: unknown | null;
}
interface ResultAPI {
  source?: string;
  result?: ResultPayload | null;
  error?: string;
}

function pretty(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2) ?? "";
  } catch {
    // fallback if v contains cycles
    return String(v);
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const baseEnv = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "";
  const origin = baseEnv || (host ? `${proto}://${host}` : "");

  const url = `${origin}/api/submissions/${encodeURIComponent(id)}/result`;

  let payload: ResultAPI | null = null;
  let error: string | null = null;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const j = (await res.json()) as ResultAPI;
    if (!res.ok) {
      error = j?.error ?? `HTTP ${res.status}`;
    } else {
      payload = j;
    }
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : String(e);
  }

  if (error) {
    return (
      <main className="p-6 max-w-3xl mx-auto space-y-3">
        <h1 className="text-2xl font-semibold">Report</h1>
        <p className="text-sm text-red-600">Failed to load result: {error}</p>
        <p className="text-xs text-gray-500 break-all">Tried: {url}</p>
      </main>
    );
  }

  const src = payload?.source ?? "mc_submissions";
  const r = payload?.result ?? null;

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Report</h1>
      <p className="text-sm text-gray-600">
        Submission: <code>{id}</code> · Source: {src}
      </p>

      {!r ? (
        <p>Result pending.</p>
      ) : (
        <div className="grid gap-4">
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

          {r.scores && (
            <div className="border rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-2">Scores</h2>
              <pre className="text-sm whitespace-pre-wrap">
                {pretty(r.scores)}
              </pre>
            </div>
          )}

          {r.raw !== undefined && r.raw !== null && (
            <details className="border rounded-xl p-4">
              <summary className="cursor-pointer font-medium">Raw</summary>
              <pre className="text-xs whitespace-pre-wrap">
                {pretty(r.raw)}
              </pre>
            </details>
          )}
        </div>
      )}
    </main>
  );
}

