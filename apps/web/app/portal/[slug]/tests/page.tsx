export const dynamic = "force-dynamic";

import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type Test = {
  id: string;
  name: string | null;
  slug: string | null;
  is_active: boolean | null;
  kind: string | null;
  org_id: string;
};

async function getTestsForOrg(slug: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE!;
  if (!url || !key) {
    throw new Error(
      "Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE"
    );
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Resolve org
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (orgErr) throw new Error(`Org lookup failed: ${orgErr.message}`);
  if (!org) throw new Error(`Org not found for slug: ${slug}`);

  // Load tests
  const { data: tests, error: testsErr } = await supabase
    .from("tests")
    .select("id, name, slug, is_active, kind, org_id")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false });

  if (testsErr) throw new Error(`Tests query failed: ${testsErr.message}`);

  return { org, tests: (tests ?? []) as Test[] };
}

// ----- Server Action: create a link then go to that test’s page -----
async function createLinkAction(formData: FormData) {
  "use server";
  const testId = String(formData.get("testId") || "");
  const slug = String(formData.get("slug") || "");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE!;
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Create link with 1 use by default
  const { data: link, error: linkErr } = await supabase
    .from("test_links")
    .insert({ test_id: testId, max_uses: 1 })
    .select("id, token")
    .maybeSingle();

  if (linkErr) {
    // Surface a readable error on the page by throwing (Next.js renders it)
    throw new Error(`Create link failed: ${linkErr.message}`);
  }

  // Jump to the test detail where the fresh token is visible & openable
  redirect(`/portal/${slug}/tests/${testId}`);
}

export default async function TestsPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;

  let orgName = slug;
  let tests: Test[] = [];

  try {
    const loaded = await getTestsForOrg(slug);
    orgName = loaded.org.name ?? slug;
    tests = loaded.tests;
  } catch (e: any) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Tests — {orgName}</h1>
        <p className="mt-2 text-red-600">
          {e?.message || "Failed to load tests."}
        </p>
      </div>
    );
  }

  if (!tests.length) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Tests — {orgName}</h1>
        <p className="mt-2 text-slate-600">No tests found for this org.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-semibold">Tests — {orgName}</h1>

      <div className="space-y-4">
        {tests.map((t) => (
          <div key={t.id} className="bg-white border rounded p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold">
                  {t.name ?? t.slug ?? t.id}
                </div>
                <div className="text-xs font-mono text-slate-600">
                  {t.slug ?? t.id}
                </div>
                <div className="text-xs text-slate-500">
                  {t.kind ?? "full"} · {t.is_active ? "active" : "archived"}
                </div>
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/portal/${slug}/tests/${t.id}`}
                  className="px-3 py-2 rounded bg-gray-900 text-white hover:opacity-90"
                >
                  Open
                </Link>

                <form action={createLinkAction}>
                  <input type="hidden" name="testId" value={t.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <button
                    type="submit"
                    className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300"
                  >
                    Create link (server)
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
