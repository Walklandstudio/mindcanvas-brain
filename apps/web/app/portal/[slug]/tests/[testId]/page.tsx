export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

export default async function TestDetail({
  params,
}: {
  params: { slug: string; testId: string };
}) {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );

  const { data: org } = await db
    .from("portal.v_organizations")
    .select("id, slug, name")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!org) return <div className="p-6 text-red-600">Org not found</div>;

  const { data: test } = await db
    .from("portal.v_org_tests")
    .select("*")
    .eq("id", params.testId)
    .maybeSingle();

  if (!test) return <div className="p-6 text-red-600">Test not found</div>;

  const wrongOrg = test.org_id !== org.id;

  const { data: links } = await db
    .from("portal.test_links")
    .select("id, token, use_count, max_uses, created_at")
    .eq("test_id", test.id)
    .order("created_at", { ascending: false })
    .limit(25);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Test — {test.name ?? test.slug ?? test.id}</h1>

      {wrongOrg && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-amber-800 text-sm">
          This test belongs to a different org. test.org_id: <code>{String(test.org_id)}</code> · org.id: <code>{String(org.id)}</code>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-2">Recent links</h2>
        <div className="space-y-2">
          {(links ?? []).map((l: any) => (
            <div key={l.id} className="flex items-center justify-between bg-white border rounded px-3 py-2">
              <code className="text-xs">{l.token}</code>
              <div className="text-xs text-slate-500">
                uses {l.use_count ?? 0} / {l.max_uses ?? "∞"}
              </div>
              <Link href={`/t/${l.token}/start`} className="px-2 py-1 rounded bg-black text-white text-xs">
                Open link
              </Link>
            </div>
          ))}
          {(!links || links.length === 0) && (
            <div className="text-sm text-slate-500">No links yet. Create one on the tests page.</div>
          )}
        </div>
        <Link href={`/portal/${org.slug}/tests`} className="text-sm underline text-slate-600">
          ← Back to Tests
        </Link>
      </div>
    </div>
  );
}
