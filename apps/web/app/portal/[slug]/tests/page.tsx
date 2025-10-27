export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

async function load(slug: string) {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );

  const { data: org, error: orgErr } = await db
    .from("portal.v_organizations")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();

  if (orgErr) throw new Error(orgErr.message);
  if (!org) throw new Error(`Org not found: ${slug}`);

  const { data: tests, error: tErr } = await db
    .from("portal.v_org_tests")
    .select("*")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false });

  if (tErr) throw new Error(tErr.message);

  return { org, tests: tests ?? [] };
}

export default async function TestsPage({ params }: { params: { slug: string } }) {
  const { org, tests } = await load(params.slug);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tests — {org.name ?? org.slug}</h1>

      <div className="space-y-4">
        {tests.map((t: any) => (
          <div key={t.id} className="bg-white border rounded p-4 flex items-start justify-between">
            <div>
              <div className="font-semibold">{t.name ?? t.slug ?? t.id}</div>
              <div className="text-xs text-slate-500">
                {(t.mode ?? "full")} · {(t.status ?? "—")}
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/portal/${org.slug}/tests/${t.id}`} className="px-3 py-2 rounded bg-gray-900 text-white">
                Open
              </Link>
            </div>
          </div>
        ))}
        {tests.length === 0 && <div className="text-slate-600">No tests found for this org.</div>}
      </div>
    </div>
  );
}
