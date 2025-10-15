import { cookies } from "next/headers";
import { getServiceClient } from "@/app/_lib/supabase";
import FrameworkClient from "./FrameworkClient";

export const dynamic = "force-dynamic";

type Profile = {
  id: string;
  name: string;
  frequency: "A" | "B" | "C" | "D";
  image_url: string | null;
  ordinal: number | null;
};

export default async function FrameworkPage() {
  const cookieStore = await cookies();
  const orgId = cookieStore.get("mc_org_id")?.value ?? null;

  const supabase = getServiceClient();

  let frameworkId: string | null = null;
  let initialFrequencies: Record<"A" | "B" | "C" | "D", string> | null = null;
  let initialProfiles: Profile[] = [];

  if (orgId) {
    // Pull framework (to get frequency labels from meta)
    const { data: fw } = await supabase
      .from("org_frameworks")
      .select("id, meta")
      .eq("org_id", orgId)
      .maybeSingle();

    frameworkId = (fw?.id as string) ?? null;
    const meta = (fw?.meta as any) || {};
    if (meta?.frequencies) {
      initialFrequencies = meta.frequencies as Record<"A" | "B" | "C" | "D", string>;
    }

    // Pull profiles
    const { data: profs } = await supabase
      .from("org_profiles")
      .select("id, name, frequency, image_url, ordinal")
      .eq("org_id", orgId)
      .order("ordinal", { ascending: true });

    initialProfiles = (profs as any as Profile[]) ?? [];
  }

  return (
    <FrameworkClient
      orgId={orgId}
      frameworkId={frameworkId}
      initialProfiles={initialProfiles}
      initialFrequencies={initialFrequencies}
    />
  );
}
