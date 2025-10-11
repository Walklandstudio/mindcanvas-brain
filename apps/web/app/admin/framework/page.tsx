// apps/web/app/admin/framework/page.tsx
import { getServiceClient } from "../../_lib/supabase";
import FrameworkClient from "./FrameworkClient";

export const dynamic = "force-dynamic";

// Keep local types minimal and server-only
type FrequencyLetter = "A" | "B" | "C" | "D";
type FrequencyMeta = Record<FrequencyLetter, { name?: string; image_url?: string; image_prompt?: string }>;
type ProfileRow = {
  id: string;
  name: string;
  frequency: FrequencyLetter;
  ordinal: number;
  image_url?: string | null;
};

export default async function FrameworkPage() {
  const supabase = getServiceClient();
  const orgId = "00000000-0000-0000-0000-000000000001";

  // Fetch framework (may be null)
  const fwRes = await supabase
    .from("org_frameworks")
    .select("id,name,version,created_at,frequency_meta")
    .eq("org_id", orgId)
    .maybeSingle();

  const fw = fwRes.data ?? null;
  const frameworkId = fw?.id ?? "";

  // Fetch profiles (Supabase types data as ProfileRow[] | null)
  const profRes = await supabase
    .from("org_profiles")
    .select("id,name,frequency,ordinal,image_url")
    .eq("org_id", orgId)
    .eq("framework_id", frameworkId || "")
    .order("ordinal", { ascending: true });

  // ✅ Normalize possible nulls → concrete values
  const frequencyMeta: FrequencyMeta = (fw?.frequency_meta as FrequencyMeta) ?? {
    A: {},
    B: {},
    C: {},
    D: {},
  };

  const profiles: ProfileRow[] = (profRes.data ?? []) as ProfileRow[];

  return (
    <main className="max-w-6xl mx-auto p-6 text-white">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Framework</h1>
          {fw ? (
            <p className="text-white/70">
              Name: <b>{fw.name}</b> · Version: <b>{fw.version}</b> · ID:{" "}
              <span className="font-mono">{fw.id}</span>
            </p>
          ) : (
            <p className="text-white/70">No framework yet</p>
          )}
        </div>
      </div>

      <FrameworkClient frequencyMeta={frequencyMeta} profiles={profiles} />

      {profiles.length === 0 && (
        <p className="mt-6 text-white/70">
          Tip: Click <b>Generate with AI</b> first, then <b>Generate Images</b>.
        </p>
      )}
    </main>
  );
}
