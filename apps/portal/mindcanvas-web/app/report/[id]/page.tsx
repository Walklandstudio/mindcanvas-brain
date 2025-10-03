// app/report/[id]/page.tsx
import ReportClient, { ReportData } from './ReportClient';

export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReportPage({ params }: PageProps) {
  const { id } = await params;

  const base = process.env.NEXT_PUBLIC_BASE_URL?.trim() || '';
  const res = await fetch(`${base}/api/submissions/${id}/result`, { cache: 'no-store' });

  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    return (
      <div className="p-6 text-red-600">
        Failed to load report. {msg && <span className="text-xs opacity-70">({msg})</span>}
      </div>
    );
  }

  const payload = (await res.json()) as any;

  // Build display name if you store person fields split
  const personName = [
    payload?.person?.first_name ?? '',
    payload?.person?.last_name ?? '',
  ]
    .map((s: string) => s?.trim())
    .filter(Boolean)
    .join(' ')
    .trim();

  // Normalize flow: API might be { a,b,c,d } or { A,B,C,D }
  const flow = {
    A: Number(payload?.flow?.A ?? payload?.flow?.a ?? 0),
    B: Number(payload?.flow?.B ?? payload?.flow?.b ?? 0),
    C: Number(payload?.flow?.C ?? payload?.flow?.c ?? 0),
    D: Number(payload?.flow?.D ?? payload?.flow?.d ?? 0),
  };

  // Map profiles → requires "pct" (not "percent")
  const profiles = Array.isArray(payload?.profiles)
    ? (payload.profiles as any[]).map((p) => ({
        code: String(p.code ?? p.profile_code ?? ''),
        name: String(p.name ?? p.profile_name ?? ''),
        pct: Number(p.pct ?? p.percent ?? p.percentage ?? 0),
        color:
          typeof p.color === 'string'
            ? p.color
            : typeof p.profile_color === 'string'
            ? p.profile_color
            : undefined,
      }))
    : [];

  const data: ReportData = {
    person: personName ? { name: personName } : undefined,
    flow,
    profiles,
  };

  return <ReportClient data={data} reportId={id} />;
}
