export const dynamic = "force-dynamic";

import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type Org = { id: string; name: string | null; slug: string };
type OrgTest = {
  id: string;
  org_id: string;
  name: string | null;
  mode: string | null;       // "full", etc.
  created_at: string;
  slug: string | null;
  status: string | null;     // "active" | "archived"
};

function statusLabel(t: OrgTest) {
  return t.status ?? "—";
}

async function load(slug: string) {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );

  const { data: org, error: orgErr } = await db
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle<Org>();
  if (orgErr) throw new Error(`Org lookup failed: ${orgErr.message}`);
  if (!org) throw new Error(`Org not found for slug: ${slug}`);

  const { data: tests, error: tErr } = await db
    .from("org_tests")
    .select("id, org_id, name, mode, created_at, slug, status")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false });
  if (tErr) throw new Error(`Tests query failed: ${tErr.message}`);

  return { org, tests: (tests ?? []) as OrgTest[] };
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
  const { error } = await db
    .from("test_links")
    .insert({ test_id: testId, max_uses: 1 });
  if (error) throw new Error(`Create link failed: ${error.message}`);
  redirect(`/portal/${slug}/tests/${testId}`);
}

export default async function Page({ params }: { params: { slug: string } }) {
  try {
    const { org, tests } = await load(params.slug);

    if (!tests.length) {
      return (
        <div className="p-6">
          <h1 className="text-xl font-semibold">Tests — {org.name ?? org.slug}</h1>
          <p className="mt-2 text-slate-600">No tests found for this org.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 p-6">
        <h1 className="text-xl font-semibold">Tests — {org.name ?? org.slug}</h1>
        <div className="space-y-4">
          {tests.map((t) => (
            <div key={t.id} className="bg-white border rounded p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-base font-semibold">{t.name ?? t.slug ?? t.id}</div>
                  <div className="text-xs text-slate-500">
                    {(t.mode ?? "full")} · {statusLabel(t)}
                  </div>
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
