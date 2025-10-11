// apps/web/app/tests/page.tsx
import Link from "next/link";
import { getServiceClient } from "../_lib/supabase";

export const dynamic = "force-dynamic";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

type TestRow = {
  id: string;
  name: string;
  mode: "free" | "full";
  created_at: string;
};

export default async function TestsIndexPage() {
  const supabase = getServiceClient();

  // Ensure org exists (idempotent)
  await supabase.from("organizations").upsert(
    { id: ORG_ID, name: "Demo Org" },
    { onConflict: "id" }
  );

  const res = await supabase
    .from("org_tests")
    .select("id,name,mode,created_at")
    .eq("org_id", ORG_ID)
    .order("created_at", { ascending: false });

  // ✅ Normalize null → []
  const tests: TestRow[] = (res.data ?? []) as TestRow[];

  return (
    <main className="max-w-3xl mx-auto p-6 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tests</h1>
        <Link
          href="/admin/test-builder"
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-medium"
        >
          Open Test Builder
        </Link>
      </div>

      {tests.length === 0 ? (
        <p className="text-white/70 mt-4">
          No tests yet. Go to the Test Builder to seed base questions and create one.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {tests.map((t) => (
            <li
              key={t.id}
              className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between"
            >
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-white/60">
                  Mode: {t.mode} · Created:{" "}
                  {new Date(t.created_at).toLocaleString()}
                </div>
              </div>
              <Link
                className="px-3 py-1 rounded-lg bg-white text-black text-sm"
                href={`/test/${t.id}`}
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
