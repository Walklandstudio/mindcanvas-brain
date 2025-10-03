// app/(app)/clients/page.tsx
export const revalidate = 0;

import Link from "next/link";

/* ---------------- Types ---------------- */
type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type Row = {
  id: string;
  created_at?: string;
  person?: {
    first_name?: string;
    last_name?: string;
    name?: string;
    email?: string;
  };
  result?: {
    profile_code?: string;
    profile_name?: string;
  } | null;
};

/* ---------------- Small helpers ---------------- */
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const asStr = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim().length > 0 ? v : undefined;

function normalizeRow(u: unknown): Row | null {
  if (!isRecord(u)) return null;

  const id = asStr(u.id);
  if (!id) return null;

  const pr = isRecord(u.person) ? u.person : {};
  const person = {
    first_name: asStr(pr.first_name),
    last_name: asStr(pr.last_name),
    name: asStr(pr.name),
    email: asStr(pr.email),
  };

  const rr = isRecord(u.result) ? u.result : undefined;
  const result = rr
    ? {
        profile_code: asStr(rr.profile_code),
        profile_name: asStr(rr.profile_name),
      }
    : null;

  return {
    id,
    created_at: asStr(u.created_at),
    person,
    result,
  };
}

/* ---------------- Page ---------------- */
export default async function ClientsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const qParam = sp.q;
  const q = Array.isArray(qParam) ? qParam[0] : qParam;

  const base = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "";
  const url = `${base}/api/admin/clients${q ? `?q=${encodeURIComponent(q)}` : ""}`;

  const res = await fetch(url, { cache: "no-store" });
  const json: unknown = res.ok ? await res.json() : [];

  const rows: Row[] = Array.isArray(json)
    ? json
        .map((r) => normalizeRow(r))
        .filter((r): r is Row => r !== null)
    : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clients</h1>

        <form className="flex gap-2" action="/clients" method="get">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name or email"
            className="h-9 rounded-md border px-3 text-sm"
          />
          <button className="h-9 rounded-md border px-4 text-sm hover:bg-gray-50">
            Search
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Profile</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={5}>
                  No results
                </td>
              </tr>
            )}

            {rows.map((r) => {
              const fullName =
                r.person?.name ||
                [r.person?.first_name, r.person?.last_name]
                  .filter((x): x is string => !!x && x.length > 0)
                  .join(" ")
                  .trim();

              return (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-3">{fullName || "—"}</td>
                  <td className="px-4 py-3">{r.person?.email || "—"}</td>
                  <td className="px-4 py-3">
                    {r.result?.profile_name || r.result?.profile_code || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/clients/${r.id}`}
                      className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
