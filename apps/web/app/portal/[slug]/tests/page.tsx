export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

async function load(slug: string) {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );

  // org
  const { data: org, error: orgErr } = await db
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (orgErr) throw new Error(`Org lookup failed: ${orgErr.message}`);
  if (!org) throw new Error(`Org not found for slug: ${slug}`);

  // tests from org_tests by org_id
  const { data: tests, error: tErr } = await db
    .from("org_tests")
    .select("id, org_id, name, mode, created_at, slug, status")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false });
  if (tErr) throw new Error(`Tests query failed: ${tErr.message}`);

  // If none, collect a couple of quick counts for visibility
  let debug: { total?: number; for_org?: number } = {};
  if (!tests || tests.length === 0) {
    const totalCount = await db.from("org_tests").select("id", { count: "exact", head: true });
    const orgCount = await db
      .from("org_tests")
      .select("id", { count: "exact", head: true })
      .eq("org_id", org.id);
    debug.total = totalCount.count ?? 0;
    debug.for_org = orgCount.count ?? 0;
  }

  return { org, tests: tests ?? [], debug };
}

async function createLinkAction(formData: FormData) {
  "use server";
  const testId = String(formData.get("testId") || "");
  const slug = String(formData.get("slug") || "");
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );
  const { error } = await db.from("test_links").insert({ test_id: testId, max_uses: 1 });
  if (error) throw new Error(`Create link failed: ${error.message}`);
  redirect(`/portal/${slug}/tests/${testId}`);
}

export default async function Page({ params }: { params: { slug: string } }) {
  try {
    const { org, tests, debug } = await load(params.slug);

    if (tests.length === 0) {
      return (
        <div className="p-6 space-y-4">
          <h1 className="text-xl font-semibold">Tests — {org.name ?? org.slug}</h1>
          <p className="text-slate-600">No tests found for this org.</p>
          <div className="text-xs text-slate-600">
            <div className="font-semibold">Debug</div>
            <div>org.id = <code>{org.id}</code></div>
            {"total" in debug && <div>org_tests total: <code>{debug.total}</code></div>}
            {"for_org" in debug && <div>for this org_id: <code>{debug.for_org}</code></div>}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 p-6">
        <h1 className="text-xl font-semibold">Tests — {org.name ?? org.slug}</h1>
        <div className="space-y-4">
          {tests.map((t: any) => (
            <div key={t.id} className="bg-white border rounded p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-base font-semibold">{t.name ?? t.slug ?? t.id}</div>
                  <div className="text-xs text-slate-500">{(t.mode ?? "full")} · {(t.status ?? "—")}</div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/portal/${org.slug}/tests/${t.id}`} className="px-3 py-2 rounded bg-gray-900 text-white">
                    Open
                  </Link>
                  <form action={createLinkAction}>
                    <input type="hidden" name="testId" value={t.id} />
                    <input type="hidden" name="slug" value={org.slug} />
                    <button type="submit" className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300">
                      Create link
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } catch (e: any) {
    return <div className="p-6 text-red-600">{e?.message || "Failed to load tests."}</div>;
  }
}
