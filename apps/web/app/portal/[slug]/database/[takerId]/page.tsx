// Server component — /portal/[slug]/database/[takerId]
// Shows contact info + latest results (robust, no views required)

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";

type Totals = Record<string, number> | string | null | undefined;

function parseTotals(totals: Totals): Record<string, number> {
  if (!totals) return {};
  try {
    if (typeof totals === "string") {
      const once = JSON.parse(totals);
      if (typeof once === "string") return JSON.parse(once);
      return once;
    }
    return totals;
  } catch {
    return {};
  }
}

function sortEntries(obj: Record<string, number>) {
  return Object.entries(obj)
    .filter(([, v]) => typeof v === "number")
    .sort((a, b) => (b[1] === a[1] ? a[0].localeCompare(b[0]) : b[1] - a[1]));
}

export default async function TakerDetail({
  params,
}: {
  params: { slug: string; takerId: string };
}) {
  const { slug, takerId } = params;
  const sb = createClient().schema("portal");

  const { data: org } = await sb
    .from("orgs")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!org) return notFound();

  const { data: taker } = await sb
    .from("test_takers")
    .select("id, org_id, first_name, last_name, email")
    .eq("id", takerId)
    .maybeSingle();
  if (!taker || taker.org_id !== org.id) return notFound();

  const fullName =
    [taker.first_name, taker.last_name].filter(Boolean).join(" ").trim() || "—";

  const { data: results } = await sb
    .from("test_results")
    .select("id, created_at, totals")
    .eq("taker_id", taker.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const latest = (results ?? [])[0] || null;
  const totals = parseTotals(latest?.totals ?? null);
  const sorted = sortEntries(totals);
  const top = sorted[0];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{fullName}</h1>
          <p className="text-sm text-gray-500">{org.name}</p>
        </div>
        <Link
          href={`/portal/${slug}/database`}
          className="rounded-md border px-3 py-2 text-sm"
        >
          Back to database
        </Link>
      </header>

      <section className="rounded-xl border p-4 bg-white">
        <h2 className="font-medium mb-2">Contact</h2>
        <dl className="grid grid-cols-3 gap-2 text-sm">
          <dt className="text-gray-500">Name</dt>
          <dd className="col-span-2">{fullName}</dd>
          <dt className="text-gray-500">Email</dt>
          <dd className="col-span-2">{taker.email || "—"}</dd>
        </dl>
      </section>

      <section className="rounded-xl border p-4 bg-white">
        <h2 className="font-medium mb-2">Latest Result</h2>
        <dl className="grid grid-cols-3 gap-2 text-sm mb-4">
          <dt className="text-gray-500">Completed</dt>
          <dd className="col-span-2">
            {latest?.created_at
              ? new Date(latest.created_at as any).toLocaleString()
              : "—"}
          </dd>
          <dt className="text-gray-500">Top profile</dt>
          <dd className="col-span-2">
            {top ? `${top[0]} (${top[1]})` : "—"}
          </dd>
        </dl>

        <div className="overflow-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Profile</th>
                <th className="px-3 py-2 text-left font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(([name, score]) => (
                <tr key={name} className="border-t">
                  <td className="px-3 py-2">{name}</td>
                  <td className="px-3 py-2">{score}</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-gray-500" colSpan={2}>
                    No results yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border p-4 bg-white">
        <h2 className="font-medium mb-2">Debug</h2>
        <pre className="text-xs overflow-auto bg-gray-50 p-3 rounded">
{JSON.stringify({ taker, latest }, null, 2)}
        </pre>
      </section>
    </div>
  );
}
