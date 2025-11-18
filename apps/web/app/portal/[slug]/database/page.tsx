// Server component — Database list for /portal/[slug]/database
// Uses only portal.orgs + portal.test_takers (no views). Always renders.

import Link from "next/link";
import { createClient } from "@/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  page?: string;
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

  // 1) Resolve org by slug
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

  // 2) Basic taker list (filter by name/email). No views, no joins.
  const q = (searchParams.q || "").toLowerCase();
  const page = Math.max(parseInt(searchParams.page || "1", 10), 1);
  const pageSize = 25;
  const from = (page - 1) * pageSize;

  const { data: takers, error: tkErr } = await sb
    .from("test_takers")
    .select("id, first_name, last_name, email")
    .eq("org_id", org.id)
    .order("id", { ascending: false })
    .range(from, from + pageSize);

  if (tkErr) {
    return (
      <div className="p-6 text-red-400">
        {tkErr.message || "Failed to load test takers."}
      </div>
    );
  }

  const filtered = (takers ?? []).filter((t: any) => {
    const name = [t.first_name, t.last_name].filter(Boolean).join(" ").toLowerCase();
    const email = (t.email || "").toLowerCase();
    return !q || name.includes(q) || email.includes(q);
  });

  const rows = filtered.slice(0, pageSize).map((t: any) => ({
    id: t.id,
    name: [t.first_name, t.last_name].filter(Boolean).join(" ").trim() || "—",
    email: t.email || "—",
  }));
  const hasNext = filtered.length > pageSize;

  // SAFE query builder (don’t spread Next.js searchParams — it contains Symbols)
  const gotoPage = (n: number) => {
    const usp = new URLSearchParams();
    if (q) usp.set("q", q);
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
          <button
            type="submit"
            className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
          >
            Download CSV
          </button>
        </form>
      </header>

      {/* Search */}
      <form className="grid gap-3 md:grid-cols-[minmax(0,2fr)_auto]">
        <input
          name="q"
          defaultValue={searchParams.q || ""}
          placeholder="Search name or email…"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
        />
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
                <td className="px-4 py-6 text-center text-slate-500" colSpan={3}>
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
