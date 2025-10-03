// app/report/[id]/page.tsx
export const revalidate = 0;

import ReportClient from "./ReportClient";

/* ---------------- Types ---------------- */
type PageProps = { params: Promise<{ id: string }> };

type Flow = { A: number; B: number; C: number; D: number };

type Person = {
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  phone?: string;
};

type ProfileRow = {
  code: string;
  name: string;
  percent: number;
  pct: number;
  color?: string;
};

type ReportData = {
  id: string;
  person?: Person;
  flow: Flow;
  profiles: ProfileRow[];
  profile?: { code?: string; name?: string };
};

/* ---------------- Helpers ---------------- */
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const asStr = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim().length > 0 ? v : undefined;

const asNum = (v: unknown): number | undefined => {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

function mapColor(code: string | undefined): string | undefined {
  switch (code) {
    case "P1":
      return "#175f15";
    case "P2":
      return "#2ecc2f";
    case "P3":
      return "#ea430e";
    case "P4":
      return "#f52905";
    case "P5":
      return "#f3c90d";
    case "P6":
      return "#f8ee18";
    case "P7":
      return "#5d5d5d";
    case "P8":
      return "#8a8583";
    default:
      return undefined;
  }
}

function normalizeFlow(u: unknown): Flow {
  const r = isRecord(u) ? u : {};
  const A = asNum(r.A) ?? 0;
  const B = asNum(r.B) ?? 0;
  const C = asNum(r.C) ?? 0;
  const D = asNum(r.D) ?? 0;
  return { A, B, C, D };
}

function normalizeProfiles(u: unknown): ProfileRow[] {
  if (!Array.isArray(u)) return [];
  return u
    .map((raw): ProfileRow | null => {
      const r = isRecord(raw) ? raw : {};
      const code = asStr(r.code) ?? "";
      // avoid mixing by computing name step-by-step
      const nameFromObj = asStr(r.name);
      const fallbackName = code || "Profile";
      const name = nameFromObj ?? fallbackName;

      const pctFromPercent = asNum(r.percent);
      const pctFromPct = asNum(r.pct);
      const percent = pctFromPercent ?? pctFromPct ?? 0;

      return {
        code,
        name,
        percent,
        pct: percent,
        color: mapColor(code),
      };
    })
    .filter((x): x is ProfileRow => x !== null);
}

function normalizeReport(u: unknown, id: string): ReportData {
  const r = isRecord(u) ? u : {};

  const pr = isRecord(r.person) ? r.person : {};
  const person: Person = {
    first_name: asStr(pr.first_name),
    last_name: asStr(pr.last_name),
    name: asStr(pr.name),
    email: asStr(pr.email),
    phone: asStr(pr.phone),
  };

  let top: { code?: string; name?: string } | undefined;
  if (isRecord(r.profile)) {
    const code = asStr(r.profile.code);
    const name = asStr(r.profile.name);
    if (code || name) top = { code, name };
  }

  return {
    id,
    person,
    flow: normalizeFlow(r.flow),
    profiles: normalizeProfiles(r.profiles),
    profile: top,
  };
}

/* ---------------- Page ---------------- */
export default async function ReportPage({ params }: PageProps) {
  const { id } = await params;

  // avoid mixing ?? and ||
  const baseRaw = process.env.NEXT_PUBLIC_BASE_URL;
  const base = (baseRaw ?? "").trim();

  const res = await fetch(`${base}/api/submissions/${id}/result`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    return (
      <div className="p-6 text-red-600">
        Failed to load report.{" "}
        {msg && <span className="text-xs opacity-70">({msg})</span>}
      </div>
    );
  }

  const raw: unknown = await res.json();
  const data = normalizeReport(raw, id);

  return <ReportClient data={data} reportId={id} />;
}
