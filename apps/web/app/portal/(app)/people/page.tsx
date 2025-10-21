import { getActiveOrgId, supabaseServer } from "@/app/_lib/portal";

export default async function PeoplePage() {
  const supabase = supabaseServer();
  const orgId = await getActiveOrgId();
  if (!orgId) return <main className="p-6">No organization context.</main>;

  const { data: takers } = await supabase
    .from("test_takers")
    .select("id, email, full_name, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">People</h1>
      <AddPerson />
      <div className="mt-6 divide-y rounded-md border">
        {(takers ?? []).map((t) => (
          <div key={t.id} className="p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{t.full_name || t.email}</div>
              <div className="text-sm text-gray-500">{t.email}</div>
            </div>
          </div>
        ))}
        {(takers ?? []).length === 0 && <div className="p-4 text-gray-500">No takers yet.</div>}
      </div>
    </main>
  );
}

function AddPerson() {
  async function action(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "");
    const full_name = String(formData.get("full_name") || "");
    await fetch("/api/portal/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, full_name }),
    });
  }

  return (
    <form action={action} className="flex gap-2">
      <input name="full_name" placeholder="Full name" className="flex-1 rounded-md border px-3 py-2" />
      <input name="email" placeholder="Email" className="flex-1 rounded-md border px-3 py-2" />
      <button className="rounded-md border px-3 py-2">Add</button>
    </form>
  );
}
