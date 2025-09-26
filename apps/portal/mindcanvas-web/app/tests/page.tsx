// app/tests/page.tsx
import { supabaseServer } from "@/lib/supabaseServer";

export default async function TestsPage() {
  const db = supabaseServer();

  // Try your `tests` table first
  const { data, error } = await db
    .from("tests")
    .select("id, slug, name")
    .order("name", { ascending: true });

  // Fallback to our known test if table is empty/absent
  const rows =
    (!error && data?.length ? data : [{ slug: "competency-coach", name: "Competency Coach" }]) as Array<
      { id?: string; slug: string; name?: string }
    >;

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Available Tests</h1>
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.id ?? r.slug ?? i} className="border rounded p-3 flex items-center gap-3">
            <div className="text-sm font-medium">{r.name ?? r.slug}</div>
            <span className="flex-1" />
            <a className="text-sm underline" href={`/test/${encodeURIComponent(r.slug)}`}>
              Take test
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
