// apps/web/app/admin/framework/page.tsx
import { ensureFrameworkForOrg, DEMO_ORG_ID } from "../../_lib/framework";
import FrameworkClient from "./FrameworkClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default async function Page() {
  let data: any = null;
  try {
    data = await ensureFrameworkForOrg(DEMO_ORG_ID);
  } catch (e: any) {
    return (
      <main className="max-w-3xl mx-auto p-6 text-white">
        <h1 className="text-2xl font-semibold">Framework</h1>
        <p className="mt-4 text-red-300">Failed to prepare framework: {e?.message || String(e)}</p>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-6 text-white">
      <h1 className="text-2xl font-semibold">Framework</h1>
      <p className="text-white/70">Frequencies and profiles are generated from your onboarding data.</p>
      <div className="mt-6">
        <FrameworkClient
          frequencyMeta={data.frequency_meta as any}
          profiles={data.profiles as any}
        />
      </div>
    </main>
  );
}
