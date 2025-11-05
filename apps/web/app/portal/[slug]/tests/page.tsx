import TestsClient from "./tests.client";
import { createClient } from "@/lib/server/supabaseAdmin";
export const dynamic = "force-dynamic";

export default async function TestsPage({ params }: any) {
  const { slug } = params;
  const sb = createClient().schema("portal");

  const { data: org, error: orgErr } = await sb
    .from("v_organizations")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();

  if (orgErr) return <div className="p-6 text-red-600">{orgErr.message}</div>;
  if (!org) return <div className="p-6 text-red-600">Organization not found</div>;

  const { data: tests, error: testsErr } = await sb
    .from("v_org_tests")
    .select("*")
    .eq("org_slug", slug)
    .order("created_at", { ascending: false });

  if (testsErr)
    return <div className="p-6 text-red-600">Failed to load tests: {testsErr.message}</div>;

  // prefetch links per test
  const linksByTest: Record<string, any[]> = {};
  if (tests?.length) {
    const ids = tests.map((t: any) => t.test_id);
    const { data: links, error: linksErr } = await sb
      .from("v_test_links")
      .select("*")
      .in("test_id", ids);

    if (!linksErr) {
      for (const l of links ?? []) {
        (linksByTest[l.test_id] ||= []).push(l);
      }
    }
  }

  return <TestsClient org={org} tests={tests ?? []} linksByTest={linksByTest} />;
}
