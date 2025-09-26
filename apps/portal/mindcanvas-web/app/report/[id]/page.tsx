// app/report/[id]/page.tsx
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Prefer env if you set it (e.g. https://mindcanvas-web-app.vercel.app)
  const baseEnv = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "";
  const origin = baseEnv || (host ? `${proto}://${host}` : "");

  const url = `${origin}/api/submissions/${encodeURIComponent(id)}/result`;

  let json: any = null;
  let error: string | null = null;

  try {
    const res = await fetch(url, { cache: "no-store" });
    json = await res.json();
    if (!res.ok) error = json?.error ?? `HTTP ${res.status}`;
  } catch (e) {
    error = (e as Error).message;
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

  const src = json?.source ?? "mc_submissions";
  const r = json?.result ?? null;

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
            {"total_score" in r && (
              <p>
                Total Score: <strong>{r.total_score}</strong>
              </p>
            )}
          </div>

          {"scores" in r && r.scores && (
            <div className="border rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-2">Scores</h2>
              <pre className="text-sm whitespace-pre-wrap">
                {JSON.stringify(r.scores, null, 2)}
              </pre>
            </div>
          )}

          {"raw" in r && r.raw && (
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

