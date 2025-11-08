// Server component — bulletproof Database list for /portal/[slug]/database
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
      <div className="p-6 text-red-600">
        {orgErr?.message || "Organisation not found"}
      </div>
    );
  }

  // 2) Basic taker list (filter by name/email). No views, no joins.
  const q = (searchParams.q || "").toLowerCase();
  const page = Math.max(parseInt(searchParams.page || "1", 10), 1);
  const pageSize = 25;
  const from = (page - 1) * pageSize;

  // Overfetch by one to detect "hasNext"
  const { data: takers, error: tkErr } = await sb
    .from("test_takers")
    .select("id, first_name, last_name, email")
    .eq("org_id", org.id)
    .order("id", { ascending: false })
    .range(from, from + pageSize); // +1 for hasNext

  if (tkErr) {
    return (
      <div className="p-6 text-red-600">
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
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Database</h1>
        <form action={`/api/portal/takers-export`} method="GET">
          <input type="hidden" name="org" value={slug} />
          <input type="hidden" name="q" value={q} />
          <button className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50" type="submit">
            Download CSV
          </button>
        </form>
      </header>

      <form className="grid gap-3 md:grid-cols-4">
        <input
          name="q"
          defaultValue={searchParams.q || ""}
          placeholder="Search name or email…"
          className="rounded-md border px-3 py-2 text-sm"
        />
        <button className="rounded-md border px-3 py-2 text-sm" type="submit">
          Apply
        </button>
      </form>

      <div className="overflow-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">Email</th>
              <th className="px-3 py-2 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{r.email}</td>
                <td className="px-3 py-2">
                  <Link className="underline" href={`/portal/${slug}/database/${r.id}`}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={3}>
                  No test takers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">Page {page}</span>
        <div className="flex gap-2">
          <Link href={gotoPage(Math.max(1, page - 1))} className="rounded-md border px-3 py-1 text-sm">
            Prev
          </Link>
          <Link href={gotoPage(hasNext ? page + 1 : page)} className="rounded-md border px-3 py-1 text-sm">
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}
