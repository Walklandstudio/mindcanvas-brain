// apps/web/app/admin/framework/page.tsx
import FrameworkEditor from "./ui/FrameworkEditor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Profile = {
  id: string;
  name: string;
  frequency: "A" | "B" | "C" | "D";
  ordinal: number;
};

async function getProfiles(): Promise<{ profiles: Profile[] }> {
  // Use a relative fetch so it works on both dev and Vercel
  const res = await fetch("/api/admin/framework", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load profiles");
  return res.json();
}

export default async function FrameworkPage() {
  const { profiles } = await getProfiles();

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Framework — Profiles (8)</h1>
        <p className="text-sm text-slate-300">
          Edit names, assign A–D, and set ordering (1–8). These map test results → profile.
        </p>

        {/* Generate from onboarding (Industry / Sector heuristics) */}
        <div className="mt-2 flex items-center gap-3">
          <form action="/api/admin/framework/generate" method="post">
            <button
              className="rounded-2xl px-4 py-2 text-sm"
              style={{
                background:
                  "linear-gradient(135deg, var(--mc-c1), var(--mc-c2) 60%, var(--mc-c3))",
              }}
            >
              Generate from Onboarding
            </button>
          </form>
          <span className="text-xs text-slate-400">
            Seeds the 8 profiles using your Industry/Sector. You can fine-tune afterward.
          </span>
        </div>
      </header>

      <section className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
        <FrameworkEditor initialProfiles={profiles} />
      </section>
    </main>
  );
}
