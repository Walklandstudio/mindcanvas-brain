// apps/web/app/t/[token]/result/page.tsx
import Link from "next/link";

type ReportResp = {
  ok: boolean;
  data?: {
    test_name: string;
    taker: { id: string; first_name: string | null; last_name: string | null; email: string | null };
    scores: { A: number; B: number; C: number; D: number };
    percentages: { A: number; B: number; C: number; D: number };
    top_freq: "A" | "B" | "C" | "D";
    profile_exact_key: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "D1" | "D2";
  };
  error?: string;
};

type LabelsResp = {
  ok: boolean;
  data?: { profileLabels: Record<string, string>; frequencyLabels: Record<string, string> };
  error?: string;
};

export const dynamic = "force-dynamic";

export default async function ResultPage({ params, searchParams }: { params: { token: string }, searchParams: { tid?: string } }) {
  const token = params.token;
  const tid = (searchParams?.tid || "").trim();

  const [reportRes, labelsRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/public/test/${token}/report?tid=${encodeURIComponent(tid)}`, { cache: "no-store" })
      .then(r => r.json() as Promise<ReportResp>),
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/public/test/${token}/labels`, { cache: "no-store" })
      .then(r => r.json() as Promise<LabelsResp>)
  ]);

  if (!reportRes.ok || !reportRes.data) {
    return (
      <div className="min-h-screen mc-bg text-white p-6">
        <h1 className="text-2xl font-semibold mb-2">Couldn’t load result</h1>
        <p className="text-white/80">{reportRes.error || "Unknown error"}</p>
      </div>
    );
  }

  const d = reportRes.data;
  const labels = labelsRes.ok && labelsRes.data ? labelsRes.data : { profileLabels: {}, frequencyLabels: {} };

  const fullName = `${d.taker.first_name ?? ""} ${d.taker.last_name ?? ""}`.trim() || d.taker.email || "Test Taker";
  const freqName = labels.frequencyLabels[d.top_freq] ?? `Frequency ${d.top_freq}`;
  const profileName = labels.profileLabels[d.profile_exact_key] ?? d.profile_exact_key;

  const bars: Array<{ code: "A"|"B"|"C"|"D"; pct: number; label: string }> = [
    { code: "A", pct: d.percentages.A, label: labels.frequencyLabels["A"] ?? "Frequency A" },
    { code: "B", pct: d.percentages.B, label: labels.frequencyLabels["B"] ?? "Frequency B" },
    { code: "C", pct: d.percentages.C, label: labels.frequencyLabels["C"] ?? "Frequency C" },
    { code: "D", pct: d.percentages.D, label: labels.frequencyLabels["D"] ?? "Frequency D" },
  ];

  return (
    <div className="min-h-screen mc-bg text-white p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{d.test_name}</h1>
        <div className="text-white/80">{fullName}</div>
      </header>

      <section className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
        <div className="text-sm text-white/60">Top Frequency</div>
        <div className="text-xl font-semibold">{freqName} ({d.top_freq})</div>
        <div className="text-sm text-white/60">Profile</div>
        <div className="text-xl font-semibold">{profileName} ({d.profile_exact_key})</div>
      </section>

      <section className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
        <div className="text-lg font-semibold">Percentages</div>
        <div className="space-y-3">
          {bars.map(b => (
            <div key={b.code}>
              <div className="flex justify-between text-sm text-white/80 mb-1">
                <span>{b.label} ({b.code})</span>
                <span>{b.pct}%</span>
              </div>
              <div className="h-3 w-full bg-white/10 rounded-lg overflow-hidden">
                <div
                  className="h-3 bg-white"
                  style={{ width: `${Math.max(0, Math.min(100, b.pct))}%` }}
                  aria-hidden
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="text-white/70 text-sm">
        <Link href={`/t/${token}/result?tid=${encodeURIComponent(tid)}`} className="underline">
          Refresh
        </Link>
      </div>
    </div>
  );
}

