// apps/web/app/portal/home/page.tsx
import { getServerSupabase, getActiveOrg } from "@/app/_lib/portal";

export default async function HomePage() {
  const sb = await getServerSupabase();
  const org = await getActiveOrg(sb);

  const [{ count: testCount }, { count: qCount }, { count: optCount }] = await Promise.all([
    sb.from("org_tests").select("id", { count: "exact", head: true }).eq("org_id", org.id),
    sb.from("test_questions").select("id", { count: "exact", head: true }).eq("org_id", org.id),
    sb.from("test_options").select("id", { count: "exact", head: true }).eq("org_id", org.id),
  ]);

  const { data: tests } = await sb
    .from("org_tests")
    .select("id, name, slug, status, mode, created_at")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Client Portal — {org.name}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Tests" value={testCount ?? 0} />
        <Card title="Questions" value={qCount ?? 0} />
        <Card title="Options" value={optCount ?? 0} />
      </div>

      <div>
        <h2 className="text-lg font-medium mb-2">Recent Tests</h2>
        <div className="divide-y rounded-lg border">
          {(tests ?? []).map((t) => (
            <div key={t.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-sm text-gray-500">/{t.slug} · {t.status} · {t.mode}</div>
              </div>
              <a className="text-blue-600 hover:underline" href={`/portal/tests?slug=${encodeURIComponent(t.slug)}`}>
                View
              </a>
            </div>
          ))}
          {(!tests || tests.length === 0) && <div className="p-4 text-gray-500">No tests yet.</div>}
        </div>
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
