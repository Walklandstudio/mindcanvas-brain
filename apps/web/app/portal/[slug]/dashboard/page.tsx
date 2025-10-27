export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";

export default async function DatabasePage({ params }: { params: { slug: string } }) {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );

  // resolve org
  const { data: org, error: orgErr } = await db
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", params.slug)
    .maybeSingle();
  if (orgErr) return <div className="p-6 text-red-600">{orgErr.message}</div>;
  if (!org) return <div className="p-6 text-red-600">Org not found</div>;

  // list test takers for this org (adjust if your table name differs)
  const { data: takers, error: tErr } = await db
    .from("test_takers")
    .select("id, email, first_name, last_name, status, created_at, test_id, link_token")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (tErr) return <div className="p-6 text-red-600">{tErr.message}</div>;

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-xl font-semibold">Database — {org.name ?? org.slug}</h1>
      {(!takers || takers.length === 0) ? (
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
              {takers!.map((r: any) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2 pr-4">{[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}</td>
                  <td className="py-2 pr-4">{r.email ?? "—"}</td>
                  <td className="py-2 pr-4">{r.status ?? "—"}</td>
                  <td className="py-2 pr-4">{new Date(r.created_at).toLocaleString()}</td>
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
