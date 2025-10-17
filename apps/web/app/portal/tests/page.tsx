// apps/web/app/portal/tests/page.tsx
import Link from "next/link";
import { ensurePortalMember } from "@/app/_lib/portal";

export const dynamic = "force-dynamic";

export default async function PortalTestsPage() {
  const { supabase, orgId } = await ensurePortalMember();
  const { data: tests } = await supabase
    .from("org_tests")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Tests</h1>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Mode</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(tests ?? []).map((t: any) => (
              <tr key={t.id} className="border-t">
                <td className="px-3 py-2">{t.name ?? t.slug ?? t.id}</td>
                <td className="px-3 py-2">{t.mode ?? "full"}</td>
                <td className="px-3 py-2">{t.status ?? "active"}</td>
                <td className="px-3 py-2">{new Date(t.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-2">
                  <Link href={`/portal/tests/${t.id}`} className="underline">Open</Link>
                </td>
              </tr>
            ))}
            {(!tests || tests.length === 0) && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={5}>
                  No tests yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
