import Link from "next/link";
import TestsClient from "./tests.client";
import { createClient } from "@/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";

export default async function TestsPage({ params }: { params: { slug: string } }) {
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

  if (testsErr) {
    return (
      <div className="p-6 text-red-600">
        Failed to load tests: {testsErr.message}
      </div>
    );
  }

  // Prefetch links per test
  const linksByTest: Record<string, any[]> = {};
  if (tests?.length) {
    const ids = tests.map((t: any) => t.test_id);
    const { data: links, error: linksErr } = await sb
      .from("v_test_links")
      .select("*")
      .in("test_id", ids);

    if (!linksErr && links) {
      for (const l of links) {
        (linksByTest[l.test_id] ||= []).push(l);
      }
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Small header row with Generate Link button that navigates to the new page */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{org.name ?? slug}</h1>
        <Link
          href={`/portal/${slug}/links`}
          className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Generate link
        </Link>
      </div>

      <TestsClient org={org} tests={tests ?? []} linksByTest={linksByTest} />
    </div>
  );
}

