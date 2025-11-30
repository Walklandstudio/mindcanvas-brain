// apps/web/app/portal/[slug]/database/page.tsx
// Server component — Database list for /portal/[slug]/database
// Uses only portal.orgs + portal.test_takers. Adds selection + bulk actions.

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
    .select("id, first_name, last_name, email, company, created_at")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false })
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
    const company = (t.company || "").toLowerCase();
    return (
      !q ||
      name.includes(q) ||
      email.includes(q) ||
      company.includes(q)
    );
  });

  const rows = filtered.slice(0, pageSize).map((t: any) => ({
    id: t.id,
    name: [t.first_name, t.last_name].filter(Boolean).join(" ").trim() || "—",
    email: t.email || "—",
    company: t.company || "—",
    created_at: t.created_at ? new Date(t.created_at) : null,
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

  const formattedDate = (d: Date | null) =>
    d ? d.toISOString().slice(0, 10) : "—";

  return (
    <div className="space-y-5 text-slate-100">
      {/* Header row: title + CSV for ALL (existing behaviour) */}
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Database</h1>
        <form action={`/api/portal/takers-export`} method="GET">
          <input type="hidden" name="org" value={slug} />
          <input type="hidden" name="q" value={q} />
          <button
            type="submit"
            className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
          >
            Download CSV (all)
          </button>
        </form>
      </header>

      {/* Search */}
      <form className="grid gap-3 md:grid-cols-[minmax(0,2fr)_auto]">
        <input
          name="q"
          defaultValue={searchParams.q || ""}
          placeholder="Search name, email, or company…"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
        />
        <button
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
          type="submit"
        >
          Apply
        </button>
      </form>

      {/* White data card with form for bulk actions */}
      <form
        method="POST"
        className="rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-lg overflow-hidden"
      >
        {/* needed for API routes to know which org these belong to */}
        <input type="hidden" name="org" value={slug} />

        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-center">
                {/* select-all is just a hint; actual selection handled in browser */}
                <input
                  type="checkbox"
                  onChange={(e) => {
                    // this handler will be ignored on server-render; it's here
                    // so React attaches it on the client to toggle all checkboxes.
                    const checked = e.currentTarget.checked;
                    const form = e.currentTarget.form;
                    if (!form) return;
                    const boxes = Array.from(
                      form.querySelectorAll<HTMLInputElement>('input[name="ids"]')
                    );
                    boxes.forEach((b) => (b.checked = checked));
                  }}
                />
              </th>
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
                <td className="px-3 py-2 text-center">
                  <input type="checkbox" name="ids" value={r.id} />
                </td>
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2">{r.email}</td>
                <td className="px-4 py-2">{r.company}</td>
                <td className="px-4 py-2">
                  {formattedDate(r.created_at)}
                </td>
                <td className="px-4 py-2 space-x-3">
                  <Link
                    className="text-sky-700 hover:text-sky-900 underline"
                    href={`/portal/${slug}/database/${r.id}`}
                  >
                    View / Edit
                  </Link>

                  {/* Single-row delete using same bulk endpoint */}
                  <button
                    type="submit"
                    name="ids"
                    value={r.id}
                    formAction="/api/portal/takers/bulk-delete"
                    className="text-xs text-red-600 hover:text-red-800 underline"
                  >
                    Delete
                  </button>
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

        {/* Bulk action buttons */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50 text-sm">
          <span className="text-slate-500">
            Select one or more rows to run bulk actions.
          </span>
          <div className="flex gap-3">
            <button
              type="submit"
              formAction="/api/portal/takers/bulk-export"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100"
            >
              Export selected
            </button>
            <button
              type="submit"
              formAction="/api/portal/takers/bulk-delete"
              className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              Delete selected
            </button>
          </div>
        </div>
      </form>

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

