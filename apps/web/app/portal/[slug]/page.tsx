import { createClient } from "@/lib/supabaseAdmin";
export const dynamic = "force-dynamic";

export default async function Dashboard({ params }: any) {
  const { slug } = params;
  const sb = createClient().schema("portal");

  const { data: org, error } = await sb
    .from("v_organizations")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();

  if (error) return <div className="p-6 text-red-600">{error.message}</div>;
  if (!org) return <div className="p-6 text-red-600">Org not found</div>;

  const { count: takerCount } = await sb
    .from("v_test_takers")
    .select("*", { count: "exact", head: true })
    .eq("org_slug", slug);

  const { count: testCount } = await sb
    .from("v_org_tests")
    .select("*", { count: "exact", head: true })
    .eq("org_slug", slug);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="border rounded-xl p-4">
        <div className="text-sm text-gray-500">Tests</div>
        <div className="text-2xl font-semibold">{testCount ?? 0}</div>
      </div>
      <div className="border rounded-xl p-4">
        <div className="text-sm text-gray-500">Test takers</div>
        <div className="text-2xl font-semibold">{takerCount ?? 0}</div>
      </div>
      <div className="border rounded-xl p-4">
        <div className="text-sm text-gray-500">Avg score (recent)</div>
        <div className="text-2xl font-semibold">—</div>
      </div>
    </div>
  );
}
