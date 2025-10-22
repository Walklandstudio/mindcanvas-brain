// apps/web/app/portal/(app)/people/page.tsx
import React from "react";
import { getAdminClient, getActiveOrgId } from "@/app/_lib/portal";

type Taker = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  team: string | null;
  created_at: string | null;
};

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  // ✅ get a real client (await)
  const supabase = await getAdminClient();
  const orgId = await getActiveOrgId(supabase);

  if (!orgId) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold">People</h1>
        <p className="text-gray-500 mt-2">No active organization.</p>
      </main>
    );
  }

  // ✅ use real columns: first_name, last_name (no name in schema)
  const { data: takers, error } = await supabase
    .from("test_takers")
    .select("id, email, first_name, last_name, team, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold">People</h1>
        <p className="text-red-600 mt-2">Error: {error.message}</p>
      </main>
    );
  }

  const rows: Taker[] = takers ?? [];

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">People</h1>

      {rows.length === 0 ? (
        <p className="text-gray-500">No test takers yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Email</th>
                <th className="text-left px-4 py-2">Team</th>
                <th className="text-left px-4 py-2">Created</th>
                <th className="text-left px-4 py-2">ID</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">
                    {(r.first_name || r.last_name)
                      ? `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim()
                      : "—"}
                  </td>
                  <td className="px-4 py-2">{r.email ?? "—"}</td>
                  <td className="px-4 py-2">{r.team ?? "—"}</td>
                  <td className="px-4 py-2">
                    {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-400">{r.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
