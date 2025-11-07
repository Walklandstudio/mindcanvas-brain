// server component - database list with filters + CSV
import Link from "next/link";
import { createClient } from "@/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  testType?: string;     // "paid" | "free"
  profile?: string;      // "P1".."P8"
  frequency?: string;    // "A".."D"
  company?: string;
  team?: string;
  page?: string;         // "1".."N"
};

export default async function DatabaseList({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: SearchParams;
}) {
  const { slug } = params;
  const sb = createClient().schema("portal");

  const q          = (searchParams.q || "").toLowerCase();
  const testType   = searchParams.testType || "";
  const profile    = searchParams.profile || "";
  const frequency  = searchParams.frequency || "";
  const company    = searchParams.company || "";
  const team       = searchParams.team || "";
  const page       = Math.max(parseInt(searchParams.page || "1", 10), 1);
  const pageSize   = 25;
  const from       = (page - 1) * pageSize;
  const to         = from + pageSize - 1;

  let query = sb
    .from("v_takers_overview")
    .select(
      "taker_id,name,email,company,team,completed_at,test_type,top_profile_code,top_profile_name,top_frequency_code,top_frequency_name",
      { count: "exact" }
    )
    .eq("org_slug", slug);

  if (q)         query = query.ilike("search_text", `%${q}%`);
  if (testType)  query = query.eq("test_type", testType);
  if (profile)   query = query.eq("top_profile_code", profile);
  if (frequency) query = query.eq("top_frequency_code", frequency);
  if (company)   query = query.eq("company", company);
  if (team)      query = query.eq("team", team);

  query = query.order("completed_at", { ascending: false }).range(from, to);

  const { data: rows, error, count } = await query;

  if (error) {
    return <div className="p-6 text-red-600">{error.message}</div>;
  }

  // Build CSV URL mirroring filters
  const usp = new URLSearchParams();
  usp.set("org", slug);
  if (q)         usp.set("q", q);
  if (testType)  usp.set("testType", testType);
  if (profile)   usp.set("profile", profile);
  if (frequency) usp.set("frequency", frequency);
  if (company)   usp.set("company", company);
  if (team)      usp.set("team", team);
  const csvUrl = `/api/portal/takers-export?${usp.toString()}`;

  // Simple pagination
  const total    = count ?? 0;
  const lastPage = Math.max(Math.ceil(total / pageSize), 1);

  const setParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams as any);
    if (!value) p.delete(key); else p.set(key, value);
    p.delete("page");
    return `/portal/${slug}/database?${p.toString()}`;
  };

  const gotoPage = (n: number) => {
    const p = new URLSearchParams(searchParams as any);
    p.set("page", String(n));
    return `/portal/${slug}/database?${p.toString()}`;
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Database</h1>
        <a
          href={csvUrl}
          className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
        >
          Download CSV
        </a>
      </header>

      <form className="grid gap-3 md:grid-cols-6">
        <input
          name="q"
          defaultValue={searchParams.q || ""}
          placeholder="Search name or email…"
          className="md:col-span-2 rounded-md border px-3 py-2 text-sm"
        />
        <select
          name="testType"
          defaultValue={testType}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          <option value="paid">Paid</option>
          <option value="free">Free</option>
        </select>
        <select
          name="profile"
          defaultValue={profile}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Any profile</option>
          <option value="P1">P1</option><option value="P2">P2</option>
          <option value="P3">P3</option><option value="P4">P4</option>
          <option value="P5">P5</option><option value="P6">P6</option>
          <option value="P7">P7</option><option value="P8">P8</option>
        </select>
        <select
          name="frequency"
          defaultValue={frequency}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Any frequency</option>
          <option value="A">A</option><option value="B">B</option>
          <option value="C">C</option><option value="D">D</option>
        </select>
        <input
          name="company"
          defaultValue={company}
          placeholder="Company…"
          className="rounded-md border px-3 py-2 text-sm"
        />
        <input
          name="team"
          defaultValue={team}
          placeholder="Team…"
          className="rounded-md border px-3 py-2 text-sm"
        />
        <div className="md:col-span-6 flex gap-2">
          <button className="rounded-md border px-3 py-2 text-sm" type="submit">
            Apply
          </button>
          <Link
            href={`/portal/${slug}/database`}
            className="rounded-md border px-3 py-2 text-sm"
          >
            Reset
          </Link>
        </div>
      </form>

      <div className="overflow-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">Email</th>
              <th className="px-3 py-2 text-left font-medium">Company</th>
              <th className="px-3 py-2 text-left font-medium">Team</th>
              <th className="px-3 py-2 text-left font-medium">Type</th>
              <th className="px-3 py-2 text-left font-medium">Completed</th>
              <th className="px-3 py-2 text-left font-medium">Top Freq</th>
              <th className="px-3 py-2 text-left font-medium">Top Profile</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.taker_id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">
                  <Link
                    href={`/portal/${slug}/database/${r.taker_id}`}
                    className="underline"
                  >
                    {r.name || "—"}
                  </Link>
                </td>
                <td className="px-3 py-2">{r.email || "—"}</td>
                <td className="px-3 py-2">{r.company || "—"}</td>
                <td className="px-3 py-2">{r.team || "—"}</td>
                <td className="px-3 py-2">{r.test_type || "—"}</td>
                <td className="px-3 py-2">
                  {r.completed_at ? new Date(r.completed_at).toLocaleString() : "—"}
                </td>
                <td className="px-3 py-2">
                  {r.top_frequency_code ? `${r.top_frequency_code} — ${r.top_frequency_name}` : "—"}
                </td>
                <td className="px-3 py-2">
                  {r.top_profile_code ? `${r.top_profile_code} — ${r.top_profile_name}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > pageSize && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Page {page} of {lastPage} • {total} results
          </span>
          <div className="flex gap-2">
            <Link
              href={gotoPage(Math.max(1, page - 1))}
              className="rounded-md border px-3 py-1 text-sm"
            >
              Prev
            </Link>
            <Link
              href={gotoPage(Math.min(lastPage, page + 1))}
              className="rounded-md border px-3 py-1 text-sm"
            >
              Next
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
