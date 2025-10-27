export const dynamic = "force-dynamic";

import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type AnyRow = Record<string, any>;

async function getTestsForOrg(slug: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );

  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (orgErr) throw new Error(`Org lookup failed: ${orgErr.message}`);
  if (!org) throw new Error(`Org not found for slug: ${slug}`);

  // ← key change: select("*") and order by "id" (always exists)
  const { data: tests, error: testsErr } = await supabase
    .from("tests")
    .select("*")
    .eq("org_id", org.id)
    .order("id", { ascending: false });

  if (testsErr) throw new Error(`Tests query failed: ${testsErr.message}`);
  return { org, tests: (tests ?? []) as AnyRow[] };
}

async function createLinkAction(formData: FormData) {
  "use server";
  const testId = String(formData.get("testId") || "");
  const slug = String(formData.get("slug") || "");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );

  const { error } = await supabase
    .from("test_links")
    .insert({ test_id: testId, max_uses: 1 })
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Create link failed: ${error.message}`);

  redirect(`/portal/${slug}/tests/${testId}`);
}

function statusLabel(t: AnyRow) {
  if (t.is_active === false) return "archived";
  if (t.active === false) return "archived";
  if (t.archived === true) return "archived";
  if (t.is_active === true || t.active === true) return "active";
  return "—";
}

export default async function TestsPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  try {
    const { org, tests } = await getTestsForOrg(slug);
    if (!tests.length) {
      return (
        <div className="p-6">
          <h1 className="text-xl font-semibold">Tests — {org.name ?? slug}</h1>
          <p className="mt-2 text-slate-600">No tests found for this org.</p>
        </div>
      );
    }
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-xl font-semibold">Tests — {org.name ?? slug}</h1>
        <div className="space-y-4">
          {tests.map((t) => (
            <div key={t.id} className="bg-white border rounded p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-base font-semibold">{t.name ?? t.id}</div>
                  <div className="text-xs text-slate-500">
                    {(t.kind ?? "full")} · {statusLabel(t)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/portal/${slug}/tests/${t.id}`} className="px-3 py-2 rounded bg-gray-900 text-white">
                    Open
                  </Link>
                  <form action={createLinkAction}>
                    <input type="hidden" name="testId" value={t.id} />
                    <input type="hidden" name="slug" value={slug} />
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
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Tests — {slug}</h1>
        <p className="mt-2 text-red-600">{e?.message || "Failed to load tests."}</p>
      </div>
    );
  }
}
