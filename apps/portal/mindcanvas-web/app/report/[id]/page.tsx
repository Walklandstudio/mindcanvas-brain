// app/report/[id]/page.tsx
import ReportClient, { ReportData } from './ReportClient';

export const revalidate = 0;

type PageProps = { params: Promise<{ id: string }> };

type Flow = { A: number; B: number; C: number; D: number };

type ApiProfile = {
  code?: unknown;
  profile_code?: unknown;
  name?: unknown;
  profile_name?: unknown;
  pct?: unknown;
  percent?: unknown;
  percentage?: unknown;
  color?: unknown;
  profile_color?: unknown;
};

type ApiPayload = {
  person?: unknown;
  flow?: unknown;
  profiles?: unknown;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

const asNum = (v: unknown, fallback = 0): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
};

const asStr = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim().length > 0 ? v : undefined;

function normalizeFlow(u: unknown): Flow {
  if (!isRecord(u)) return { A: 0, B: 0, C: 0, D: 0 };
  return {
    A: asNum(u.A ?? u.a),
    B: asNum(u.B ?? u.b),
    C: asNum(u.C ?? u.c),
    D: asNum(u.D ?? u.d),
  };
}

function normalizeProfiles(u: unknown): ReportData['profiles'] {
  if (!Array.isArray(u)) return [];
  return u.map((raw): ReportData['profiles'][number] => {
    const r = (isRecord(raw) ? raw : {}) as ApiProfile;
    const code = asStr(r.code) ?? asStr(r.profile_code) ?? '';
    const name = asStr(r.name) ?? asStr(r.profile_name) ?? '';
    const pct = asNum(r.pct ?? r.percent ?? r.percentage);
    const color = asStr(r.color) ?? asStr(r.profile_color);
    return { code, name, pct, color };
  });
}

function normalizePerson(u: unknown): ReportData['person'] {
  if (!isRecord(u)) return undefined;
  const first = asStr(u.first_name);
  const last = asStr(u.last_name);
  const name =
    asStr(u.name) ??
    [first, last].filter((x): x is string => Boolean(x)).join(' ').trim();
  return name ? { name } : undefined;
}

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

  const json: unknown = await res.json();

  const payload: ApiPayload = isRecord(json) ? (json as ApiPayload) : {};

  const data: ReportData = {
    person: normalizePerson(payload.person),
    flow: normalizeFlow(payload.flow),
    profiles: normalizeProfiles(payload.profiles),
  };

  return <ReportClient data={data} reportId={id} />;
}
