// app/(app)/clients/[id]/page.tsx
export const revalidate = 0;

import Link from "next/link";

/* ---------------- Types ---------------- */
type PageProps = { params: Promise<{ id: string }> };

type Person = {
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  phone?: string;
};

type Result = {
  report_id?: string;
  profile_code?: string;
  profile_name?: string;
  flow_a?: number;
  flow_b?: number;
  flow_c?: number;
  flow_d?: number;
};

type Answer = {
  question?: string;
  // display-labels selected by the user (already localized/expanded)
  options?: string[];
  // raw selected keys/ids if your API returns them
  selected?: string[];
};

type ClientDetail = {
  id: string;
  created_at?: string;
  person?: Person;
  result?: Result | null;
  answers?: Answer[];
};

/* ---------------- Small guards/helpers ---------------- */
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

function normalizeDetail(u: unknown): ClientDetail | null {
  if (!isRecord(u)) return null;
  const id = asStr(u.id);
  if (!id) return null;

  const p = isRecord(u.person) ? u.person : {};
  const person: Person = {
    first_name: asStr(p.first_name),
    last_name: asStr(p.last_name),
    name: asStr(p.name),
    email: asStr(p.email),
    phone: asStr(p.phone),
  };

  const r = isRecord(u.result) ? u.result : undefined;
  const result: Result | null = r
    ? {
        report_id: asStr(r.report_id),
        profile_code: asStr(r.profile_code),
        profile_name: asStr(r.profile_name),
        flow_a: asNum(r.flow_a) ?? 0,
        flow_b: asNum(r.flow_b) ?? 0,
        flow_c: asNum(r.flow_c) ?? 0,
        flow_d: asNum(r.flow_d) ?? 0,
      }
    : null;

  const answers: Answer[] = Array.isArray(u.answers)
    ? u.answers.map((a) => {
        const ar = isRecord(a) ? a : {};
        return {
          question: asStr(ar.question),
          options: Array.isArray(ar.options)
            ? ar.options
                .map((x) => asStr(x))
                .filter((x): x is string => !!x)
            : undefined,
          selected: Array.isArray(ar.selected)
            ? ar.selected
                .map((x) => asStr(x))
                .filter((x): x is string => !!x)
            : undefined,
        };
      })
    : [];

  return {
    id,
    created_at: asStr(u.created_at),
    person,
    result,
    answers,
  };
}

/* ---------------- Page ---------------- */
export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;

  const baseRaw = process.env.NEXT_PUBLIC_BASE_URL;
  const base = (baseRaw ?? "").trim();
  const res = await fetch(`${base}/api/admin/clients/${id}`, { cache: "no-store" });
  if (!res.ok) {
    return (
      <div className="p-6 text-red-600">
        Failed to load client: {await res.text().catch(() => "")}
      </div>
    );
  }

  const raw: unknown = await res.json();
  const detail = normalizeDetail(raw);
  if (!detail) {
    return <div className="p-6 text-red-600">Invalid client payload.</div>;
  }

  const fullName =
    detail.person?.name ||
    [detail.person?.first_name, detail.person?.last_name]
      .filter((x): x is string => !!x && x.length > 0)
      .join(" ")
      .trim();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Client</h1>
          <p className="text-sm text-gray-500">{detail.id}</p>
        </div>
        <Link
          href="/clients"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          ← Back
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-4">
          <h2 className="mb-3 font-medium">Profile</h2>
          <div className="space-y-1 text-sm">
            <div>
              <span className="text-gray-500">Name: </span>
              <span>{fullName || "—"}</span>
            </div>
            <div>
              <span className="text-gray-500">Email: </span>
              <span>{detail.person?.email || "—"}</span>
            </div>
            <div>
              <span className="text-gray-500">Phone: </span>
              <span>{detail.person?.phone || "—"}</span>
            </div>
            <div>
              <span className="text-gray-500">Created: </span>
              <span>
                {detail.created_at
                  ? new Date(detail.created_at).toLocaleString()
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border p-4">
          <h2 className="mb-3 font-medium">Scores</h2>
          <div className="text-sm space-y-1">
            <div>
              <span className="text-gray-500">Profile: </span>
              <span>
                {detail.result?.profile_name ||
                  detail.result?.profile_code ||
                  "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Flow (A/B/C/D): </span>
              <span>
                {(detail.result?.flow_a ?? 0)}/{detail.result?.flow_b ?? 0}/
                {detail.result?.flow_c ?? 0}/{detail.result?.flow_d ?? 0}
              </span>
            </div>
            {detail.result?.report_id && (
              <div className="pt-2">
                <Link
                  href={`/report/${detail.result.report_id}`}
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  View Report
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border">
        <details open>
          <summary className="cursor-pointer list-none px-4 py-3 font-medium">
            Answers
          </summary>
          <div className="divide-y">
            {detail.answers && detail.answers.length > 0 ? (
              detail.answers.map((a, i) => (
                <div key={i} className="px-4 py-3 text-sm">
                  <div className="font-medium">{a.question || "—"}</div>
                  {a.options && a.options.length > 0 ? (
                    <ul className="mt-1 list-disc pl-5 text-gray-700">
                      {a.options.map((o, j) => (
                        <li key={j}>{o}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-gray-500">—</div>
                  )}
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No answers found.
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}
