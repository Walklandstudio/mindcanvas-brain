export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";

export default async function DatabasePage({ params }: { params: { slug: string } }) {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );

  const { data: org } = await db
    .from("portal.v_organizations")
    .select("id, name, slug")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!org) return <div className="p-6 text-red-600">Org not found</div>;

  const { data: rows, error } = await db
    .from("portal.test_takers")
    .select("*")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return <div className="p-6 text-red-600">{error.message}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Database — {org.name ?? org.slug}</h1>
      {!rows?.length ? (
        <div className="text-slate-600">No test takers yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4">Test</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2 pr-4">
                    {[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="py-2 pr-4">{r.email ?? "—"}</td>
                  <td className="py-2 pr-4">{r.status ?? "—"}</td>
                  <td className="py-2 pr-4">
                    {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                  </td>
                  <td className="py-2 pr-4">{r.test_id ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
