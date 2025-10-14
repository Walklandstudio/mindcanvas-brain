// Server layout that wraps all /onboarding/* pages
import Link from "next/link";

type Onboarding = {
  company?: Record<string, any>;
  branding?: Record<string, any>;
  goals?: Record<string, any>;
};

async function loadOnboarding(): Promise<Onboarding> {
  // Works both locally and on Vercel; falls back to relative
  const base =
    process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "";
  try {
    const r = await fetch(`${base}/api/onboarding`, { cache: "no-store" });
    if (!r.ok) return {};
    const j = await r.json();
    return j.onboarding ?? {};
  } catch {
    return {};
  }
}

export default async function OnboardingLayout({
  children,
}: { children: React.ReactNode }) {
  const ob = await loadOnboarding();

  const steps = [
    {
      key: "create-account",
      label: "Create Account",
      href: "/onboarding/create-account",
      done: !!(ob.company?.companyName && ob.company?.email),
    },
    {
      key: "company",
      label: "Company",
      href: "/onboarding/company",
      done: !!(ob.company?.industry || ob.company?.website),
    },
    {
      key: "branding",
      label: "Branding",
      href: "/onboarding/branding",
      done: !!(ob.branding?.primary || ob.branding?.font),
    },
    {
      key: "goals",
      label: "Goals",
      href: "/onboarding/goals",
      done: !!(ob.goals?.primaryGoal || ob.goals?.successMetric),
    },
  ];
  const pct = Math.round(
    (steps.filter((s) => s.done).length / steps.length) * 100
  );

  return (
    <div className="min-h-screen bg-[#050914] text-white">
      {/* Top bar */}
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-xl shadow-[0_8px_30px_rgba(100,186,226,0.35)]"
              style={{
                background:
                  "linear-gradient(135deg, var(--mc-c1), var(--mc-c2) 60%, var(--mc-c3))",
              }}
            />
            <span className="text-base font-semibold tracking-tight">
              Onboarding
            </span>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-slate-300 hover:text-white"
          >
            Exit
          </Link>
        </div>
      </div>

      {/* Body grid */}
      <div className="mx-auto max-w-7xl px-6 pb-16 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-6 h-max rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
          <div className="text-sm text-slate-300 mb-3">Progress</div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background:
                  "linear-gradient(135deg, var(--mc-c1), var(--mc-c2) 60%, var(--mc-c3))",
              }}
            />
          </div>
          <div className="mt-2 text-xs text-slate-400">{pct}% complete</div>

          <nav className="mt-4 space-y-2">
            {steps.map((s, i) => (
              <Link
                key={s.key}
                href={s.href}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                  s.done
                    ? "border-white/15 bg-white/10 text-slate-200"
                    : "border-white/10 text-slate-300 hover:bg-white/5"
                }`}
              >
                <span>
                  {i + 1}. {s.label}
                </span>
                <span
                  className={`ml-3 inline-flex h-5 min-w-[20px] items-center justify-center rounded-md text-[10px] ${
                    s.done
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-white/10 text-slate-300"
                  }`}
                >
                  {s.done ? "✓" : "•"}
                </span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main (child pages render here) */}
        <section className="space-y-6">{children}</section>
      </div>
    </div>
  );
}
