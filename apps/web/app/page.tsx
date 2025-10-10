import Link from "next/link";

const COLORS = {
  c1: "#64bae2",
  c2: "#2d8fc4",
  c3: "#015a8b",
};

export default function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0f1a] text-white">
      {/* --- Background layers --- */}
      {/* Radial glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[110vh] w-[110vw] -translate-x-1/2 opacity-30 blur-3xl"
        style={{
          background: `radial-gradient(60% 35% at 50% 0%, ${COLORS.c1}20, transparent 60%),
                       radial-gradient(40% 30% at 20% 40%, ${COLORS.c2}18, transparent 60%),
                       radial-gradient(45% 30% at 80% 50%, ${COLORS.c3}19, transparent 60%)`,
        }}
      />
      {/* Sleek streak band */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-1/4 top-0 h-[140vh] w-[150vw] rotate-[8deg] opacity-20"
        style={{
          background:
            `linear-gradient(90deg, transparent, ${COLORS.c3}55, ${COLORS.c1}66, ${COLORS.c2}55, transparent)`,
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
        }}
      />
      {/* Subtle grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* --- Header --- */}
      <header className="relative z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-xl"
              style={{
                background: `linear-gradient(135deg, ${COLORS.c1}, ${COLORS.c2} 60%, ${COLORS.c3})`,
              }}
            />
            <span className="text-lg font-semibold tracking-tight">MindCanvas</span>
          </div>
          <nav className="hidden gap-6 text-sm text-slate-300 sm:flex">
            <Link href="/tests" className="hover:text-white transition-colors">Tests</Link>
            <Link href="/admin/framework" className="hover:text-white transition-colors">Framework</Link>
            <Link href="/admin/compatibility" className="hover:text-white transition-colors">Compatibility</Link>
          </nav>
        </div>
      </header>

      {/* --- Hero --- */}
      <section className="relative z-10">
        <div className="mx-auto max-w-5xl px-6 pt-16 pb-10 text-center sm:pt-24 sm:pb-16">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-wide text-slate-300">
            Signature Profiling System
          </div>

          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Create, brand, deploy, and analyze{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(135deg, ${COLORS.c1}, ${COLORS.c2} 60%, ${COLORS.c3})`,
              }}
            >
              Signature
            </span>{" "}
            profile tests
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Build TEMA-based assessments (4 Frequencies × 8 Profiles), capture results, and deliver
            on-brand reports and team analytics.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/onboarding/(wizard)/create-account"
              className="inline-flex items-center justify-center rounded-2xl px-6 py-3 text-[15px] font-medium shadow-[0_10px_30px_rgba(100,186,226,0.25)] transition-transform hover:scale-[1.02] active:scale-100"
              style={{
                background: `linear-gradient(135deg, ${COLORS.c1}, ${COLORS.c2} 60%, ${COLORS.c3})`,
              }}
            >
              Create an Account
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-[15px] font-medium text-slate-200 transition hover:bg-white/10"
            >
              Login (for existing clients)
            </Link>
          </div>

          {/* Trust strip */}
          <div className="mt-10 text-xs text-slate-400">
            Secure by design · Supabase (Postgres + RLS) · Vercel Edge
          </div>
        </div>
      </section>

      {/* --- Product frame / glass card --- */}
      <div className="relative z-10 mx-auto mb-20 mt-2 max-w-6xl px-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md">
          <div className="h-[280px] w-full rounded-3xl bg-gradient-to-br from-slate-900/40 to-slate-900/10 p-4">
            <div className="h-full w-full rounded-2xl border border-white/10 bg-slate-950/40" />
          </div>
        </div>
      </div>

      {/* --- Footer --- */}
      <footer className="relative z-10 pb-10 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} MindCanvas. All rights reserved.
      </footer>
    </main>
  );
}
