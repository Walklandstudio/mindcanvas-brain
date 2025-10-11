// apps/web/app/admin/framework/page.tsx
import { ensureFrameworkForOrg, DEMO_ORG_ID } from "../../_lib/framework";
import FrameworkClient from "./FrameworkClient";

// Ensure this page is always rendered at request time on the server.
// This prevents Next from prerendering it during build and hitting the DB then.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default async function Page() {
  const data = await ensureFrameworkForOrg(DEMO_ORG_ID);

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
