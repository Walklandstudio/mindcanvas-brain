import { getActiveOrgId, supabaseServer } from "@/app/_lib/portal";

export default async function TestsPage() {
  const supabase = supabaseServer();
  const orgId = await getActiveOrgId();
  if (!orgId) return <main className="p-6">No organization context.</main>;

  const { data: tests } = await supabase
    .from("org_tests")
    .select("id, name, kind, question_count")
    .eq("org_id", orgId)
    .order("name");

  async function GenLink({ testId }: { testId: string }) {
    const res = await fetch("/api/portal/links", {
      method: "POST",
      body: JSON.stringify({ testId }),
      headers: { "Content-Type": "application/json" },
    });
    const j = await res.json();
    alert(j.publicUrl ?? j.error);
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Tests</h1>
      <div className="grid gap-3">
        {(tests ?? []).map((t) => (
          <div key={t.id} className="rounded-md border p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{t.name}</div>
              <div className="text-sm text-gray-500">{t.kind} · {t.question_count ?? 0} questions</div>
            </div>
            {/* @ts-expect-error Server Action shim (simple clientless action) */}
            <form action={async () => { "use server"; await GenLink({ testId: t.id }); }}>
              <button className="rounded-md border px-3 py-2" formAction={GenLink.bind(null, { testId: t.id })}>
                Generate Link
              </button>
            </form>
          </div>
        ))}
      </div>
    </main>
  );
}
