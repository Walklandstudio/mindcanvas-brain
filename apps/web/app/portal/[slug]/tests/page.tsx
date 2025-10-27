export const dynamic = "force-dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

async function load(slug: string) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!, { auth: { persistSession: false } });
  const { data: org } = await db.from("portal.v_organizations").select("id, name, slug").eq("slug", slug).maybeSingle();
  if (!org) throw new Error(`Org not found: ${slug}`);
  const { data: tests } = await db.from("portal.v_org_tests").select("*").eq("org_id", org.id).order("created_at", { ascending: false });
  return { org, tests: tests ?? [] };
}

async function createLinkAction(formData: FormData) {
  "use server";
  const testId = String(formData.get("testId") || "");
  const slug = String(formData.get("slug") || "");
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!, { auth: { persistSession: false } });
  const { error } = await db.from("portal.test_links").insert({ test_id: testId, max_uses: 1 });
  if (error) throw new Error(error.message);
  redirect(`/portal/${slug}/tests/${testId}`);
}

export default async function Page({ params }: { params: { slug: string } }) {
  const { org, tests } = await load(params.slug);
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-semibold">Tests — {org.name ?? org.slug}</h1>
      <div className="space-y-4">
        {tests.map((t: any) => (
          <div key={t.id} className="bg-white border rounded p-4 flex items-start justify-between">
            <div>
              <div className="font-semibold">{t.name ?? t.slug ?? t.id}</div>
              <div className="text-xs text-slate-500">{(t.mode ?? "full")} · {(t.status ?? "—")}</div>
            </div>
            <div className="flex gap-2">
              <Link href={`/portal/${org.slug}/tests/${t.id}`} className="px-3 py-2 rounded bg-gray-900 text-white">Open</Link>
              <form action={createLinkAction}>
                <input type="hidden" name="testId" value={t.id} />
                <input type="hidden" name="slug" value={org.slug} />
                <button className="px-3 py-2 rounded bg-gray-200">Create link</button>
              </form>
            </div>
          </div>
        ))}
        {tests.length === 0 && <div className="text-slate-600">No tests found for this org.</div>}
      </div>
    </div>
  );
}
