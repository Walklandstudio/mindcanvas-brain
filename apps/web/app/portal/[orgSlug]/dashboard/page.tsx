// Server component – no client hooks here.
import { createClient } from "@/utils/supabase/server";
import DashboardClient from "./DashboardClient";
import Link from "next/link";

type Props = { params: { orgSlug: string }; searchParams: { testId?: string } };

export default async function OrgDashboardPage({ params, searchParams }: Props) {
  const supabase = createClient();
  const orgSlug = params.orgSlug;

  // 1) Resolve testId (use query ?testId=... or pick the most recent from v_org_tests)
  const testId = searchParams.testId
    ?? (await supabase.schema("portal")
          .from("v_org_tests")
          .select("test_id")
          .eq("org_slug", orgSlug)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle())
        .data?.test_id;

  if (!testId) {
    return (
      <div className="p-6">
        <div className="mb-4 text-sm text-muted-foreground">
          No test found for <b>{orgSlug}</b>.
        </div>
        <Link href={`/portal/${orgSlug}`} className="underline">Back to org</Link>
      </div>
    );
  }

  // 2) Fetch all dashboard datasets (read-only views)
  const [{ data: freq }, { data: prof }, { data: top3 }, { data: low3 }, { data: overall }] =
    await Promise.all([
      supabase.schema("portal")
        .from("v_dashboard_avg_frequency")
        .select("frequency_code,frequency_name,avg_points")
        .eq("org_slug", orgSlug)
        .eq("test_id", testId),

      supabase.schema("portal")
        .from("v_dashboard_avg_profile")
        .select("profile_code,profile_name,avg_points")
        .eq("org_slug", orgSlug)
        .eq("test_id", testId),

      supabase.schema("portal")
        .from("v_dashboard_top3_profiles")
        .select("profile_code,profile_name,avg_points")
        .eq("org_slug", orgSlug)
        .eq("test_id", testId),

      supabase.schema("portal")
        .from("v_dashboard_bottom3_profiles")
        .select("profile_code,profile_name,avg_points")
        .eq("org_slug", orgSlug)
        .eq("test_id", testId),

      supabase.schema("portal")
        .from("v_dashboard_overall_avg")
        .select("overall_avg")
        .eq("org_slug", orgSlug)
        .eq("test_id", testId)
        .maybeSingle(),
    ]);

  // 3) Render client chart shell
  return (
    <DashboardClient
      orgSlug={orgSlug}
      testId={testId}
      frequencies={freq ?? []}
      profiles={prof ?? []}
      top3={top3 ?? []}
      low3={low3 ?? []}
      overall={overall?.overall_avg ?? 0}
    />
  );
}
