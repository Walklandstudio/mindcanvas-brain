export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export default async function Page({ params }: { params: { slug: string; testId: string } }) {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );

  const { data: org } = await db
    .from("organizations")
    .select("id, slug, name")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!org) return <div className="p-6 text-red-600">Org not found</div>;

  const { data: test } = await db
    .from("org_tests")
    .select("id, org_id, name, mode, slug, status, created_at")
    .eq("id", params.testId)
    .eq("org_id", org.id)
    .maybeSingle();
  if (!test) return <div className="p-6 text-red-600">Test not found in this org</div>;

  const { data: links } = await db
    .from("test_links")
    .select("id, token, use_count, max_uses, created_at")
    .eq("test_id", test.id)
    .order("created_at", { ascending: false })
    .limit(25);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-semibold">Test — {test.name ?? test.slug ?? test.id}</h1>

      <div>
        <h2 className="text-lg font-semibold mb-2">Recent links</h2>
        <div className="space-y-2">
          {(links ?? []).map((l) => (
            <div key={l.id} className="flex items-center justify-between bg-white border rounded px-3 py-2">
              <code className="text-xs">{l.token}</code>
              <div className="text-xs text-slate-500">uses {l.use_count ?? 0} / {l.max_uses ?? "∞"}</div>
              <Link href={`/t/${l.token}/start`} className="px-2 py-1 rounded bg-black text-white text-xs">Open link</Link>
            </div>
          ))}
          {(!links || links.length === 0) && <div className="text-sm text-slate-500">No links yet.</div>}
        </div>
      </div>

      <Link href={`/portal/${org.slug}/tests`} className="text-sm underline text-slate-600">← Back to Tests</Link>
    </div>
  );
}
