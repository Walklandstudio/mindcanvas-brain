export const dynamic = "force-dynamic";
import { createClient } from "@supabase/supabase-js";
import CreateShareClient from "@/components/portal/CreateShareClient";
import Link from "next/link";

async function getData(testId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );

  // Load test by id ONLY (no org gate — public portal context varies)
  const { data: test } = await supabase
    .from("tests")
    .select("id, name, slug, is_active, org_id")
    .eq("id", testId)
    .maybeSingle();

  const { data: links } = await supabase
    .from("test_links")
    .select("id, token, use_count, max_uses, status")
    .eq("test_id", testId)
    .order("created_at", { ascending: false })
    .limit(15);

  return { test, links: links ?? [] };
}

export default async function Page({ params }: { params: { slug: string; testId: string } }) {
  const { test, links } = await getData(params.testId);
  if (!test) return <div className="p-6 text-red-600">Test not found.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Test — {test.name ?? test.slug}</h1>
        <div className="text-sm text-slate-500 font-mono">{test.slug}</div>
      </div>

      <CreateShareClient testId={test.id} />

      <div>
        <h2 className="text-lg font-semibold mb-2">Recent links</h2>
        <div className="space-y-2">
          {links.map((l) => (
            <div key={l.id} className="flex items-center justify-between bg-white border rounded px-3 py-2">
              <code className="text-xs">{l.token}</code>
              <div className="text-xs text-slate-500">uses {l.use_count ?? 0} / {l.max_uses ?? "∞"}</div>
              <Link href={`/t/${l.token}/start`} className="px-2 py-1 rounded bg-black text-white text-xs">Open</Link>
            </div>
          ))}
          {!links.length && <div className="text-sm text-slate-500">No links yet.</div>}
        </div>
      </div>
    </div>
  );
}
