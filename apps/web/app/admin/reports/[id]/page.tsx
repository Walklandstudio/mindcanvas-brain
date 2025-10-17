import Link from "next/link";
import { cookies } from "next/headers";
import { getServiceClient } from "@/app/_lib/supabase";
import ReportEditorClient from "./ReportEditorClient";

export const dynamic = "force-dynamic";

export default async function ReportDetail(
  props: { params: Promise<{ id: string }> } // Next 15: params is a Promise
) {
  const { id: profileId } = await props.params;

  // Next 15 server runtime: cookies() returns a Promise
  const cookieStore = await cookies();
  const orgId = cookieStore.get("mc_org_id")?.value ?? null;

  const supabase = getServiceClient();

  if (!orgId) {
    return (
      <main className="p-6 text-white">
        <Link href="/admin/reports" className="text-sky-300 underline">
          ← Back to Reports
        </Link>
        <h1 className="text-xl font-semibold mt-4">Report</h1>
        <p className="text-white/60 mt-2">No org found. Complete onboarding first.</p>
      </main>
    );
  }

  // Framework (id + frequency labels)
  const { data: fw } = await supabase
    .from("org_frameworks")
    .select("id, meta")
    .eq("org_id", orgId)
    .maybeSingle();

  const frameworkId: string | null = (fw?.id as string) ?? null;
  const freqNames =
    ((fw?.meta as any)?.frequencies as Record<"A" | "B" | "C" | "D", string> | undefined) ?? null;

  // Profile
  const { data: profile } = await supabase
    .from("org_profiles")
    .select("id, name, frequency, image_url, ordinal")
    .eq("id", profileId)
    .maybeSingle();

  // Existing report (if any)
  const { data: report } = await supabase
    .from("org_profile_reports")
    .select("sections, approved, updated_at")
    .eq("org_id", orgId)
    .eq("framework_id", frameworkId)
    .eq("profile_id", profileId)
    .maybeSingle();

  return (
    <main className="p-6 text-white space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/reports" className="text-sky-300 hover:text-sky-200 underline">
          ← Back to Reports
        </Link>
      </div>

      <ReportEditorClient
        orgId={orgId}
        frameworkId={frameworkId}
        profile={{
          id: (profile as any)?.id!,
          name: (profile as any)?.name ?? "Profile",
          frequency: (profile as any)?.frequency ?? "A",
          image_url: (profile as any)?.image_url ?? null,
        }}
        frequencyNames={freqNames}
        initialSections={(report as any)?.sections ?? {}}
        initialApproved={(report as any)?.approved ?? false}
      />
    </main>
  );
}
