// apps/web/app/portal/tests/page.tsx
import { getServerSupabase, getActiveOrg } from "@/app/_lib/portal";

export default async function TestsPage({
  searchParams,
}: {
  searchParams?: Promise<{ slug?: string }>;
}) {
  const sb = await getServerSupabase();
  const org = await getActiveOrg(sb);

  const sp = (await searchParams) ?? {};
  const slug = sp.slug;

  const base = sb
    .from("org_tests")
    .select("id, name, slug, status, mode, created_at")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false });

  const { data: tests } = slug ? await base.eq("slug", slug) : await base;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Tests — {org.name}</h1>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 text-left text-sm">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Mode</th>
              <th className="p-3">Status</th>
              <th className="p-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(tests ?? []).map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="p-3">{t.name}</td>
                <td className="p-3">{t.slug}</td>
                <td className="p-3">{t.mode}</td>
                <td className="p-3">{t.status}</td>
                <td className="p-3">{new Date(t.created_at as any).toLocaleString()}</td>
              </tr>
            ))}
            {(!tests || tests.length === 0) && (
              <tr>
                <td className="p-3 text-gray-500" colSpan={5}>
                  No tests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <a className="text-blue-600 hover:underline" href="/portal/home">
          ← Back to Home
        </a>
      </div>
    </div>
  );
}
