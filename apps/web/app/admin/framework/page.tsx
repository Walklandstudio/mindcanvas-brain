// apps/web/app/admin/framework/page.tsx
import { ensureFrameworkForOrg, DEMO_ORG_ID } from "../../_lib/framework";
import FrameworkClient from "./FrameworkClient";

export const runtime = "nodejs"; // keep on Node (AI + server work)

export default async function Page() {
  // Auto-create framework+profiles if missing
  const data = await ensureFrameworkForOrg(DEMO_ORG_ID);

  return (
    <main className="max-w-6xl mx-auto p-6 text-white">
      <h1 className="text-2xl font-semibold">Framework</h1>
      <p className="text-white/70">Frequencies and profiles are generated from your onboarding data.</p>
      <div className="mt-6">
        <FrameworkClient frequencyMeta={data.frequency_meta as any} profiles={data.profiles as any} />
      </div>
    </main>
  );
}
