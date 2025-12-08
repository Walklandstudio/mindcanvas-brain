// apps/web/app/portal/[slug]/database/page.tsx
// Server component — Database list for /portal/[slug]/database
// Simple, robust list with search, test filter, sort + CSV export.

import Link from "next/link";
import { createClient } from "@/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  testId?: string;
  purpose?: string;
  sort?: string;
  page?: string;
};

type Row = {
  id: string;
  name: string;
  email: string;
  company: string;
  testName: string;
  testPurpose: string;
  created: string;
};

export default async function DatabasePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: SearchParams;
}) {
  try {
    const { slug } = params;
    const sb = createClient().schema("portal");

    // --- 1) Resolve org by slug -------------------------------------------
    const { data: org, error: orgErr } = await sb
      .from("orgs")
      .select("id, slug, name")
      .eq("slug", slug)
      .maybeSingle();

    if (orgErr || !org) {
      throw new Error(orgErr?.message || "Organisation not found");
    }

    const q = (searchParams.q || "").trim().toLowerCase();
    const selectedTestId = (searchParams.testId || "").trim();
    const selectedPurpose = (searchParams.purpose || "").trim();
    const sortKey = (searchParams.sort || "created_desc") as
      | "created_desc"
      | "created_asc"
      | "company_asc"
      | "company_desc";

    const page = Math.max(parseInt(searchParams.page || "1", 10), 1);
    const pageSize = 100;

    // --- 2) Load tests for dropdown ---------------------------------------
    const { data: tests, error: testErr } = await sb
      .from("tests")
      .select("id, name, slug")
      .eq("org_id", org.id)
      .order("name", { ascending: true });

    if (testErr) throw new Error(testErr.message);

    // Map: test_id → test name
    const testNameById = new Map<string, string>();
    (tests ?? []).forEach((t: any) => {
      testNameById.set(t.id, t.name || t.slug || "Untitled test");
    });

    // --- 3) Load link names / purposes for this org -----------------------
    const { data: linkRows, error: linkErr } = await sb
      .from("test_links")
      .select("token, name")
      .eq("org_id", org.id);

    if (linkErr) {
      console.warn("test_links load error on database page:", linkErr.message);
    }

    // Map: link token → name (your "Test name / Test purpose")
    const linkNameByToken = new Map<string, string>();
    const purposeSet = new Set<string>();

    (linkRows ?? []).forEach((r: any) => {
      const token = (r.token || "").trim();
      const name = (r.name || "").trim();
      if (!token) return;
      if (name) {
        linkNameByToken.set(token, name);
        purposeSet.add(name);
      }
    });

    const purposeOptions = Array.from(purposeSet).sort((a, b) =>
      a.localeCompare(b),
    );

    // --- 4) Build base taker query ----------------------------------------
    let orderColumn = "created_at";
    let ascending = false;

    if (sortKey === "created_asc") {
      orderColumn = "created_at";
      ascending = true;
    } else if (sortKey === "company_asc" || sortKey === "company_desc") {
      orderColumn = "company";
      ascending = sortKey === "company_asc";
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let takerQuery = sb
      .from("test_takers")
      .select(
        "id, first_name, last_name, email, company, created_at, test_id, link_token",
        { count: "exact" }
      )
      .eq("org_id", org.id)
      .order(orderColumn, { ascending });

    if (selectedTestId) {
      takerQuery = takerQuery.eq("test_id", selectedTestId);
    }

    const { data: takers, error: tkErr } = await takerQuery.range(from, to);
    if (tkErr) throw new Error(tkErr.message);

    // --- 5) In-memory search + purpose filter -----------------------------
    const filtered = (takers ?? []).filter((t: any) => {
      // Free-text search
      if (q) {
        const name = [t.first_name, t.last_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const email = (t.email || "").toLowerCase();
        const company = (t.company || "").toLowerCase();
        const matchesSearch =
          name.includes(q) || email.includes(q) || company.includes(q);
        if (!matchesSearch) return false;
      }

      // Purpose filter (based on link_token -> name)
      if (selectedPurpose) {
        const linkToken = (t.link_token || "").trim();
        const purpose = (linkNameByToken.get(linkToken) || "").trim();
        if (purpose !== selectedPurpose) return false;
      }

      return true;
    });

    const rows: Row[] = filtered.map((t: any) => {
      const linkToken = (t.link_token || "").trim();
      const testPurpose =
        linkNameByToken.get(linkToken) || "—";

      return {
        id: t.id,
        name:
          [t.first_name, t.last_name].filter(Boolean).join(" ").trim() || "—",
        email: t.email || "—",
        company: t.company || "—",
        testName: testNameById.get(t.test_id) || "—",
        testPurpose,
        created: t.created_at
          ? new Date(t.created_at as any).toISOString().slice(0, 10)
          : "—",
      };
    });

    const hasNext = filtered.length > pageSize;

    // SAFE helper to build URLs from filters (no spreading searchParams)
    const buildHref = (extra: Partial<SearchParams>) => {
      const usp = new URLSearchParams();
      if (q) usp.set("q", q);
      if (selectedTestId) usp.set("testId", selectedTestId);
      if (selectedPurpose) usp.set("purpose", selectedPurpose);
      if (sortKey) usp.set("sort", sortKey);

      const newPage = extra.page || String(page);
      usp.set("page", newPage);

      if (extra.q !== undefined) usp.set("q", extra.q);
      if (extra.testId !== undefined) usp.set("testId", extra.testId);
      if (extra.purpose !== undefined) usp.set("purpose", extra.purpose);
      if (extra.sort !== undefined) usp.set("sort", extra.sort);

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
            <input type="hidden" name="testId" value={selectedTestId} />
            {/* CSV export still filters by test + search; we can add purpose later if needed */}
            <button
              type="submit"
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
            >
              Download CSV
            </button>
          </form>
        </header>

        {/* Filters row */}
        <form
          className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_auto]"
          action={`/portal/${slug}/database`}
          method="GET"
        >
          {/* search */}
          <input
            name="q"
            defaultValue={searchParams.q || ""}
            placeholder="Search name, email, or company…"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
          />

          {/* test filter (by base test) */}
          <select
            name="testId"
            defaultValue={selectedTestId}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
          >
            <option value="">All tests</option>
            {(tests ?? []).map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.name || t.slug || "Untitled"}
              </option>
            ))}
          </select>

          {/* purpose filter */}
          <select
            name="purpose"
            defaultValue={selectedPurpose}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
          >
            <option value="">All test names / purposes</option>
            {purposeOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* sort */}
          <select
            name="sort"
            defaultValue={sortKey}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
          >
            <option value="created_desc">Newest first</option>
            <option value="created_asc">Oldest first</option>
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
                  Test name / purpose
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
              {rows.map((r, idx) => (
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
                  <td className="px-4 py-2">{r.testPurpose}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {r.created}
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
                    colSpan={7}
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
              href={buildHref({ page: String(Math.max(1, page - 1)) })}
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-1 hover:bg-white/10 transition"
            >
              Prev
            </Link>
            <Link
              href={buildHref({
                page: String(hasNext ? page + 1 : page),
              })}
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-1 hover:bg-white/10 transition"
            >
              Next
            </Link>
          </div>
        </div>
      </div>
    );
  } catch (err: any) {
    // Fallback so the route never hard-crashes
    return (
      <div className="p-6 space-y-3 text-red-200">
        <h1 className="text-xl font-semibold">Database page error</h1>
        <p className="text-sm">
          Something went wrong while loading the database view.
        </p>
        <pre className="whitespace-pre-wrap rounded border border-red-700/40 bg-red-950/40 p-3 text-xs">
          {String(err?.message || err)}
        </pre>
      </div>
    );
  }
}


