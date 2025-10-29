import { headers } from "next/headers";
import Link from "next/link";

export const dynamic = "force-dynamic";

type ReportData = {
  org_name?: string | null;
  test_name: string;
  taker: { id: string; first_name: string | null; last_name: string | null; email: string | null };
  totals: Record<"A"|"B"|"C"|"D", number>;
  percentages: Record<"A"|"B"|"C"|"D", number>;
  top_freq: "A"|"B"|"C"|"D";
  top_profile_code: string; // e.g. "PROFILE_1" or "A1"
  top_profile_name: string;
  frequency_labels: { code: "A"|"B"|"C"|"D"; name: string }[];
  profile_labels: { code: string; name: string; frequency: "A"|"B"|"C"|"D" }[];
};

function FullName(t: ReportData["taker"]) {
  const p1 = (t.first_name || "").trim();
  const p2 = (t.last_name || "").trim();
  const s = [p1, p2].filter(Boolean).join(" ");
  return s || (t.email || "—");
}

export default async function ResultPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { tid?: string };
}) {
  const token = params.token;
  const tid = searchParams?.tid || "";

  if (!tid) {
    return (
      <div className="min-h-screen p-6">
        <h1 className="text-2xl font-semibold">Missing taker id</h1>
        <p className="text-gray-600 mt-2">The URL must include <code>?tid=…</code>.</p>
      </div>
    );
  }

  // CRITICAL FIX: use a RELATIVE fetch so we never end up with "undefined/api/..."
  const res = await fetch(
    `/api/public/test/${encodeURIComponent(token)}/report?tid=${encodeURIComponent(tid)}`,
    { cache: "no-store" }
  );

  // Try to extract useful error info for display
  let payload: any = null;
  try { payload = await res.json(); } catch {}

  if (!res.ok || !payload?.ok) {
    return (
      <div className="min-h-screen p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Couldn’t load result</h1>
        <pre className="p-3 rounded bg-gray-100 text-gray-800 whitespace-pre-wrap border">
{(payload?.error || `HTTP ${res.status}`).toString()}
        </pre>
        <div className="text-sm text-gray-600">
          Debug links:
          <ul className="list-disc ml-5 mt-2">
            <li>
              <Link className="underline" href={`/api/public/test/${token}/result?tid=${tid}`} target="_blank">
                /api/public/test/{token}/result?tid={tid}
              </Link>
            </li>
            <li>
              <Link className="underline" href={`/api/public/test/${token}/report?tid=${tid}`} target="_blank">
                /api/public/test/{token}/report?tid={tid}
              </Link>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  const data = payload.data as ReportData;

  const freqOrder: Array<"A"|"B"|"C"|"D"> = ["A","B","C","D"];
  const freqName = (code: "A"|"B"|"C"|"D") =>
    data.frequency_labels.find(f => f.code === code)?.name || `Frequency ${code}`;

  return (
    <div className="min-h-screen p-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{data.test_name}</h1>
        <div className="text-gray-600">
          <span className="font-medium">{FullName(data.taker)}</span>
          {data.org_name ? <> • {data.org_name}</> : null}
        </div>
      </header>

      {/* Top profile summary */}
      <section className="rounded-2xl border p-5 space-y-2">
        <div className="text-sm text-gray-600">Top profile</div>
        <div className="text-xl font-semibold">{data.top_profile_name}</div>
        <div className="text-gray-600">
          Dominant frequency: <span className="font-medium">{freqName(data.top_freq)}</span>
        </div>
      </section>

      {/* Percent bars */}
      <section className="rounded-2xl border p-5 space-y-4">
        <div className="text-lg font-semibold">Your frequency mix</div>
        <div className="grid gap-3">
          {freqOrder.map(code => {
            const pct = Math.round((data.percentages[code] ?? 0) * 100);
            return (
              <div key={code}>
                <div className="flex justify-between text-sm">
                  <div className="font-medium">{freqName(code)}</div>
                  <div>{pct}%</div>
                </div>
                <div className="h-2 rounded bg-gray-200 overflow-hidden">
                  <div className="h-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Raw totals (optional debug) */}
      <details className="rounded-2xl border p-4">
        <summary className="cursor-pointer font-medium">Debug</summary>
        <pre className="mt-3 text-xs bg-gray-100 p-3 rounded border overflow-auto">
{JSON.stringify({ totals: data.totals, percentages: data.percentages, top: data.top_freq, topProfile: data.top_profile_code }, null, 2)}
        </pre>
      </details>
    </div>
  );
}

