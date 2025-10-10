// apps/web/app/page.tsx
import Link from "next/link";

export default function Landing() {
  return (
    <main className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* Background glow + streaks */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(1200px 600px at 70% -10%, rgba(45,143,196,0.35), transparent 60%), radial-gradient(900px 500px at -10% 20%, rgba(1,90,139,0.35), transparent 60%)",
        }}
      />
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-[140vh] w-[120vw] -translate-x-1/2 opacity-25 blur-2xl"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(90deg, rgba(1,90,139,0.15), rgba(100,186,226,0.25), rgba(45,143,196,0.15))",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
        }}
      />

      {/* Top bar */}
      <header className="relative z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl"
              style={{ background: "linear-gradient(135deg, #64bae2, #2d8fc4 60%, #015a8b)" }} />
            <span className="text-lg font-semibold tracking-tight">MindCanvas</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-slate-300">
            <Link href="/tests" className="hover:text-white transition">Tests</Link>
            <Link href="/admin/framework" className="hover:text-white transition">Framework</Link>
            <Link href="/admin/compatibility" className="hover:text-white transition">Compatibility</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10">
        <div className="mx-auto max-w-5xl px-6 pt-16 pb-10 sm:pt-24 sm:pb-16 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-wide text-slate-300">
            Signature Profiling System
          </div>

          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Create, brand, deploy, and analyze
            <span className="block">
              <span style={{ color: "#64bae2" }}>Signature</span> profile tests
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Build TEMA-based assessments (4 Frequencies × 8 Profiles), capture results,
            and deliver on-brand reports and team analytics.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/onboarding/(wizard)/create-account"
              className="inline-flex items-center justify-center rounded-2xl px-5 py-3 font-medium shadow-lg transition"
              style={{
                background: "linear-gradient(135deg, #64bae2, #2d8fc4 60%, #015a8b)",
                boxShadow: "0 10px 30px rgba(100,186,226,0.25)",
              }}
            >
              Create an Account
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-3 font-medium text-slate-200 hover:bg-white/10 transition"
            >
              Login (for existing clients)
            </Link>
          </div>

          {/* Mini trust strip */}
          <div className="mt-10 text-xs text-slate-400">
            Secure by design · Supabase (Postgres + RLS) · Vercel Edge
          </div>
        </div>
      </section>

      {/* Hero mock frame (subtle) */}
      <div className="relative z-0 mx-auto mb-16 mt-4 max-w-6xl px-6">
        <div className="rounded-3xl border border-white/10 bg-slate-900/40 backdrop-blur-md shadow-2xl">
          <div className="h-[260px] w-full rounded-3xl bg-gradient-to-br from-slate-900/40 to-slate-900/10 p-4">
            <div className="h-full w-full rounded-2xl border border-white/10 bg-slate-950/40" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 pb-10 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} MindCanvas. All rights reserved.
      </footer>
    </main>
  );
}
