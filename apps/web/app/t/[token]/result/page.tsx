// apps/web/app/t/[token]/result/page.tsx
import { headers } from "next/headers";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // use Node for stable headers + fetch

type AB = "A" | "B" | "C" | "D";

type Taker = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type LabelFreq = { code: AB; name: string };
type LabelProfile = { code: string; name: string; frequency: AB };

type ReportData = {
  org_name?: string | null;
  test_name: string;
  taker: Taker;
  totals: Record<AB, number>;
  percentages: Record<AB, number>;
  top_freq: AB;
  top_profile_code: string;
  top_profile_name: string;
  frequency_labels: LabelFreq[];
  profile_labels: LabelProfile[];
};

type ApiResponseOk<T> = { ok: true; data: T };
type ApiResponseErr = { ok: false; error: string };
type ApiResponse<T> = ApiResponseOk<T> | ApiResponseErr;

function fullName(t: Taker) {
  const p1 = (t.first_name || "").trim();
  const p2 = (t.last_name || "").trim();
  const s = [p1, p2].filter(Boolean).join(" ");
  return s || (t.email || "—");
}

/**
 * Build an absolute origin from headers/env. In your build,
 * `headers()` is typed async, so we `await` it.
 */
async function getAbsoluteOrigin(): Promise<string> {
  try {
    const h = await headers(); // <-- fix: await
    const proto = (h.get("x-forwarded-proto") || "https").trim();
    const hostHeader =
      h.get("x-forwarded-host")?.trim() ||
      h.get("host")?.trim() ||
      process.env.VERCEL_URL?.trim() ||
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      "";

    const hostClean = hostHeader.replace(/^https?:\/\//, "");
    if (hostClean) return `${proto}://${hostClean}`;
  } catch {
    // ignore and fall back to envs
  }

  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "";

  if (envUrl) {
    const clean = envUrl.replace(/^https?:\/\//, "");
    return `https://${clean}`;
  }

  return "http://localhost:3000";
}

export default async function ResultPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { tid?: string };
}) {
  const token = params.token;
  const tid = (searchParams?.tid || "").trim();

  if (!tid) {
    return (
      <div className="min-h-screen p-6">
        <h1 className="text-2xl font-semibold">Missing taker id</h1>
        <p className="text-gray-600 mt-2">
          The URL must include <code>?tid=…</code>.
        </p>
      </div>
    );
  }

  const origin = await getAbsoluteOrigin(); // <-- fix: await
  const reportUrl = `${origin}/api/public/test/${encodeURIComponent(
    token
  )}/report?tid=${encodeURIComponent(tid)}`;

  const res = await fetch(reportUrl, { cache: "no-store" });

  let payload: ApiResponse<ReportData> | null = null;
  try {
    payload = (await res.json()) as ApiResponse<ReportData>;
  } catch {
    // keep null; handled below
  }

  if (!res.ok || !payload || payload.ok !== true) {
    const errText =
      (payload && (payload as ApiResponseErr).error) ||
      `HTTP ${res.status}${res.statusText ? ` – ${res.statusText}` : ""} when calling ${reportUrl}`;
    return (
      <div className="min-h-screen p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Couldn’t load result</h1>
        <pre className="p-3 rounded bg-gray-100 text-gray-800 whitespace-pre-wrap border">
{errText}
        </pre>
        <div className="text-sm text-gray-600">
          Debug links:
          <ul className="list-disc ml-5 mt-2">
            <li>
              <Link
                className="underline"
                href={`/api/public/test/${token}/result?tid=${tid}`}
                target="_blank"
              >
                /api/public/test/{token}/result?tid={tid}
              </Link>
            </li>
            <li>
              <Link
                className="underline"
                href={`/api/public/test/${token}/report?tid=${tid}`}
                target="_blank"
              >
                /api/public/test/{token}/report?tid={tid}
              </Link>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  const data = (payload as ApiResponseOk<ReportData>).data;

  const order: AB[] = ["A", "B", "C", "D"];
  const freqName = (code: AB) =>
    data.frequency_labels.find((f: LabelFreq) => f.code === code)?.name ||
    `Frequency ${code}`;

  return (
    <div className="min-h-screen p-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{data.test_name}</h1>
        <div className="text-gray-600">
          <span className="font-medium">{fullName(data.taker)}</span>
          {data.org_name ? <> • {data.org_name}</> : null}
        </div>
      </header>

      <section className="rounded-2xl border p-5 space-y-2">
        <div className="text-sm text-gray-600">Top profile</div>
        <div className="text-xl font-semibold">{data.top_profile_name}</div>
        <div className="text-gray-600">
          Dominant frequency:{" "}
          <span className="font-medium">{freqName(data.top_freq)}</span>
        </div>
      </section>

      <section className="rounded-2xl border p-5 space-y-4">
        <div className="text-lg font-semibold">Your frequency mix</div>
        <div className="grid gap-3">
          {order.map((code: AB) => {
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
    </div>
  );
}

