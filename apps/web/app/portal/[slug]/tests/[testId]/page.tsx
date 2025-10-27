export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

async function load(slug: string, testId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );

  const { data: org } = await supabase
    .from("organizations").select("id, name, slug").eq("slug", slug).maybeSingle();
  if (!org) throw new Error("Org not found");

  const { data: test } = await supabase
    .from("tests").select("id, name, is_active, kind, org_id").eq("id", testId).eq("org_id", org.id).maybeSingle();
  if (!test) throw new Error("Test not found or not in this org");

  const { data: links } = await supabase
    .from("test_links")
    .select("id, token, use_count, max_uses")
    .eq("test_id", test.id)
    .order("created_at", { ascending: false })
    .limit(25);

  return { org, test, links: links ?? [] };
}

export default async function Page({ params }: { params: { slug: string; testId: string } }) {
  try {
    const { org, test, links } = await load(params.slug, params.testId);
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-xl font-semibold">Test — {test.name ?? test.id}</h1>

        <div>
          <h2 className="text-lg font-semibold mb-2">Recent links</h2>
          <div className="space-y-2">
            {links.map((l) => (
              <div key={l.id} className="flex items-center justify-between bg-white border rounded px-3 py-2">
                <code className="text-xs">{l.token}</code>
                <div className="text-xs text-slate-500">uses {l.use_count ?? 0} / {l.max_uses ?? "∞"}</div>
                <Link href={`/t/${l.token}/start`} className="px-2 py-1 rounded bg-black text-white text-xs">Open link</Link>
              </div>
            ))}
            {links.length === 0 && <div className="text-sm text-slate-500">No links yet — go back and “Create link”.</div>}
          </div>
        </div>

        <Link href={`/portal/${org.slug}/tests`} className="text-sm underline text-slate-600">← Back to Tests</Link>
      </div>
    );
  } catch (e: any) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Test</h1>
        <p className="text-red-600">{e?.message || "Test not found or not in this org."}</p>
      </div>
    );
  }
}
