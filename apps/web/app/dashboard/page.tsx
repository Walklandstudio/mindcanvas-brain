import Link from "next/link";

type Onboarding = {
  company?: Record<string, any>;
  branding?: Record<string, any>;
  goals?: Record<string, any>;
};

// helper to load onboarding (server)
async function getOnboarding(): Promise<Onboarding> {
  const r = await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL ? 'https://' + process.env.NEXT_PUBLIC_VERCEL_URL : ''}/api/onboarding`, { cache: "no-store" })
    .catch(() => undefined);
  if (!r || !r.ok) return { company: {}, branding: {}, goals: {} };
  const j = await r.json();
  return j.onboarding ?? { company: {}, branding: {}, goals: {} };
}

export default async function Dashboard() {
  const ob = await getOnboarding();

  const steps = [
    {
      key: "account",
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

  const completeCount = steps.filter(s => s.done).length;
  const pct = Math.round((completeCount / steps.length) * 100);

  return (
    <main className="min-h-screen bg-[#050914] text-white">
      {/* top bar */}
      <div className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-xl shadow-[0_8px_30px_rgba(100,186,226,0.35)]"
            style={{ background: "linear-gradient(135deg, var(--mc-c1), var(--mc-c2) 60%, var(--mc-c3))" }}
          />
          <span className="text-lg font-semibold">Dashboard</span>
        </div>
        <Link href="/logout" className="text-sm text-slate-300 hover:text-white">Sign out</Link>
      </div>

      {/* content */}
      <div className="mx-auto max-w-7xl px-6 pb-16 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-6 h-max rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
          <div className="text-sm text-slate-300 mb-3">Onboarding Progress</div>

          {/* progress bar */}
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(135deg, var(--mc-c1), var(--mc-c2) 60%, var(--mc-c3))",
              }}
            />
          </div>
          <div className="mt-2 text-xs text-slate-400">{pct}% complete</div>

          {/* steps */}
          <nav className="mt-4 space-y-2">
            {steps.map((s, i) => (
              <Link
                key={s.key}
                href={s.href}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                  s.done
                    ? "border-white/15 bg-white/10 text-slate-200"
                    : "border-white/10 bg-transparent text-slate-300 hover:bg-white/5"
                }`}
              >
                <span>{i + 1}. {s.label}</span>
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

        {/* Main */}
        <section className="space-y-6">
          {/* welcome / quick actions */}
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
            <h2 className="text-xl font-semibold">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-300">
              Finish onboarding to unlock report templates, tests, and team analytics.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/admin/framework"
                className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
              >
                Edit Framework
              </Link>
              <Link
                href="/admin/compatibility"
                className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
              >
                Compatibility Matrix
              </Link>
              <Link
                href="/admin/questions"
                className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
              >
                Questions
              </Link>
              <Link
                href="/tests"
                className="rounded-2xl bg-white text-slate-900 px-4 py-2 text-sm font-medium"
                style={{ background: "linear-gradient(135deg, var(--mc-c1), var(--mc-c2) 60%, var(--mc-c3))" }}
              >
                Create a Test
              </Link>
            </div>
          </div>

          {/* empty states / cards (placeholders for now) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm text-slate-300 mb-2">Recent Tests</div>
              <div className="text-xs text-slate-400">No tests yet — create your first one.</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm text-slate-300 mb-2">Team Analytics</div>
              <div className="text-xs text-slate-400">Insights will appear once results come in.</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
