// Server component — Database list for /portal/[slug]/database
// Uses portal.orgs + portal.tests + portal.test_takers (no views).

import Link from "next/link";
import { createClient } from "@/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  page?: string;
  test?: string; // test slug
  sort?: string; // sort key
};

export default async function DatabasePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: SearchParams;
}) {
  const { slug } = params;
  const sb = createClient().schema("portal");

  // ---- 1) Resolve org by slug ----
  const { data: org, error: orgErr } = await sb
    .from("orgs")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();

  if (orgErr || !org) {
    return (
      <div className="p-6 text-red-400">
        {orgErr?.message || "Organisation not found"}
      </div>
    );
  }

  // ---- 2) Load tests for this org (for filter + labels) ----
  const { data: tests, error: testsErr } = await sb
    .from("tests")
    .select("id, name, slug")
    .eq("org_id", org.id)
    .order("created_at", { ascending: true });

  if (testsErr) {
    return (
      <div className="p-6 text-red-400">
        {testsErr.message || "Failed to load tests."}
      </div>
    );
  }

  const testsById: Record<
    string,
    { name: string; slug: string | null }
  > = {};
  for (const t of tests ?? []) {
    if (!t?.id) continue;
    testsById[t.id as string] = {
      name: (t.name as string) ?? "Untitled test",
      slug: (t.slug as string | null) ?? null,
    };
  }

  const q = (searchParams.q || "").toLowerCase();
  const page = Math.max(parseInt(searchParams.page || "1", 10), 1);
  const pageSize = 25;
  const from = (page - 1) * pageSize;

  const selectedTestSlug = searchParams.test || "";
  const sortKey = searchParams.sort || "created_desc";

  // Resolve test filter -> test_id
  let testIdFilter: string | null = null;
  if (selectedTestSlug) {
    const match = (tests ?? []).find(
      (t: any) => t.slug === selectedTestSlug
    );
    if (match?.id) testIdFilter = match.id as string;
  }

  // ---- 3) Base test_takers query ----
  let query = sb
    .from("test_takers")
    .select(
      "id, first_name, last_name, email, company, created_at, test_id"
    )
    .eq("org_id", org.id);

  if (testIdFilter) {
    query = query.eq("test_id", testIdFilter);
  }

  // Sorting (server-side)
  switch (sortKey) {
    case "name_asc":
      query = query
        .order("first_name", { ascending: true })
        .order("last_name", { ascending: true });
      break;
    case "name_desc":
      query = query
        .order("first_name", { ascending: false })
        .order("last_name", { ascending: false });
      break;
    case "company_asc":
      query = query.order("company", {
        ascending: true,
      });
      break;
    case "company_desc":
      query = query.order("company", {
        ascending: false,
      });
      break;
    case "created_asc":
      query = query.order("created_at", {
        ascending: true,
      });
      break;
    case "created_desc":
    default:
      query = query.order("created_at", {
        ascending: false,
      });
      break;
  }

  const { data: takers, error: tkErr } = await query.range(
    from,
    from + pageSize
  );

  if (tkErr) {
    return (
      <div className="p-6 text-red-400">
        {tkErr.message || "Failed to load test takers."}
      </div>
    );
  }

  // ---- 4) Local filter by q (name/email/company) ----
  const filtered = (takers ?? []).filter((t: any) => {
    const name = [t.first_name, t.last_name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const email = (t.email || "").toLowerCase();
    const company = (t.company || "").toLowerCase();
    if (!q) return true;
    return (
      name.includes(q) ||
      email.includes(q) ||
      company.includes(q)
    );
  });

  const rows = filtered.slice(0, pageSize).map((t: any) => {
    const testMeta =
      (t.test_id && testsById[t.test_id as string]) || null;
    const createdIso =
      typeof t.created_at === "string"
        ? t.created_at
        : t.created_at?.toISOString?.() ?? null;

    return {
      id: t.id as string,
      name:
        [t.first_name, t.last_name]
          .filter(Boolean)
          .join(" ")
          .trim() || "—",
      email: (t.email as string) || "—",
      company: (t.company as string) || "—",
      testName: testMeta?.name ?? "—",
      testSlug: testMeta?.slug ?? null,
      createdDate: createdIso ? createdIso.slice(0, 10) : "—",
    };
  });

  const hasNext = filtered.length > pageSize;

  // SAFE query builder (don’t spread Next.js searchParams — it contains Symbols)
  const gotoPage = (n: number) => {
    const usp = new URLSearchParams();
    if (q) usp.set("q", q);
    if (selectedTestSlug) usp.set("test", selectedTestSlug);
    if (sortKey) usp.set("sort", sortKey);
    usp.set("page", String(n));
    const qs = usp.toString();
    return `/portal/${slug}/database${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-5 text-slate-100">
      {/* Header row: title + CSV */}
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Database</h1>
        <form action={`/api/portal/takers-export`} method="GET">
          <input type="hidden" name="org" value={slug} />
          <input type="hidden" name="q" value={q} />
          {/* we could also pass test/sort later if/when the export supports it */}
          <button
            type="submit"
            className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
          >
            Download CSV
          </button>
        </form>
      </header>

      {/* Filters row: search + test filter + sort */}
      <form className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.3fr)_auto]">
        {/* Search */}
        <input
          name="q"
          defaultValue={searchParams.q || ""}
          placeholder="Search name, email, or company…"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
        />

        {/* Test filter */}
        <select
          name="test"
          defaultValue={selectedTestSlug}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
        >
          <option value="">All tests</option>
          {(tests ?? []).map((t: any) => (
            <option key={t.id} value={t.slug || ""}>
              {t.name} {t.slug ? `— ${t.slug}` : ""}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          name="sort"
          defaultValue={sortKey}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
        >
          <option value="created_desc">Newest first</option>
          <option value="created_asc">Oldest first</option>
          <option value="name_asc">Name A → Z</option>
          <option value="name_desc">Name Z → A</option>
          <option value="company_asc">Company A → Z</option>
          <option value="company_desc">Company Z → A</option>
        </select>

        <button
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
          type="submit"
        >
          Apply
        </button>
      </form>

      {/* White data card */}
      <div className="rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-lg overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Name
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Email
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Company
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Test
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Created
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any, idx: number) => (
              <tr
                key={r.id}
                className={
                  "border-t border-slate-100" +
                  (idx % 2 === 1 ? " bg-slate-50" : "") +
                  " hover:bg-slate-100/80"
                }
              >
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2">{r.email}</td>
                <td className="px-4 py-2">{r.company}</td>
                <td className="px-4 py-2">{r.testName}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {r.createdDate}
                </td>
                <td className="px-4 py-2">
                  <Link
                    className="text-sky-700 hover:text-sky-900 underline"
                    href={`/portal/${slug}/database/${r.id}`}
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  className="px-4 py-6 text-center text-slate-500"
                  colSpan={6}
                >
                  No test takers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-300">Page {page}</span>
        <div className="flex gap-2">
          <Link
            href={gotoPage(Math.max(1, page - 1))}
            className="rounded-xl border border-white/20 bg-white/5 px-3 py-1 hover:bg-white/10 transition"
          >
            Prev
          </Link>
          <Link
            href={gotoPage(hasNext ? page + 1 : page)}
            className="rounded-xl border border-white/20 bg-white/5 px-3 py-1 hover:bg-white/10 transition"
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}

