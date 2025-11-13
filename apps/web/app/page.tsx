import Link from "next/link";

const P = { c1: "#64bae2", c2: "#2d8fc4", c3: "#015a8b" }; // your palette

export default function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050914] text-white">
      {/* --- BACKGROUND LAYERS --- */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-40 left-1/2 h-[120vh] w-[120vw] -translate-x-1/2 blur-3xl opacity-30"
          style={{
            background: `radial-gradient(60% 40% at 50% 0%, ${P.c1}33, transparent 60%),
                         radial-gradient(45% 35% at 20% 45%, ${P.c2}26, transparent 60%),
                         radial-gradient(45% 35% at 80% 55%, ${P.c3}24, transparent 60%)`,
          }}
        />
      </div>

      {/* Neon ribbon sweep */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-1/3 top-[-10%] h-[160vh] w-[180vw] rotate-[12deg] opacity-35"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${P.c3}66 25%, ${P.c2}88 50%, ${P.c1}66 75%, transparent 100%)`,
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
          filter: "blur(18px)",
        }}
      />

      {/* Soft grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* --- HEADER --- */}
      <header className="relative z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-xl shadow-[0_8px_30px_rgba(100,186,226,0.35)]"
              style={{ background: `linear-gradient(135deg, ${P.c1}, ${P.c2} 60%, ${P.c3})` }}
            />
            <span className="text-base font-semibold tracking-tight">MindCanvas</span>
          </div>

          {/* Header nav: Login + Admin (for testing) */}
          <nav className="hidden md:flex items-center gap-4 text-sm">
            <Link href="/login" className="text-slate-300 hover:text-white">
              Login
            </Link>
            <Link href="/portal/admin" className="text-slate-300 hover:text-white">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* --- HERO --- */}
      <section className="relative z-10">
        <div className="mx-auto max-w-6xl px-6 pt-14 pb-10 sm:pt-24 sm:pb-16 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-wide text-slate-300">
            Signature Profiling System
          </div>

          <h1 className="mt-6 text-4xl sm:text-6xl font-extrabold leading-[1.05] tracking-tight">
            Create, brand, deploy, and analyze{" "}
            <span
              className="bg-clip-text text-transparent animate-gradient-x"
              style={{
                backgroundImage: `linear-gradient(135deg, ${P.c1}, ${P.c2} 50%, ${P.c3})`,
              }}
            >
              Signature
            </span>{" "}
            profile tests
          </h1>

          {/* CTAs – only Create Account + Login */}
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/onboarding/create-account"
              className="group inline-flex items-center justify-center rounded-2xl px-6 py-3 text-[15px] font-medium transition-transform hover:scale-[1.02] active:scale-100 shine"
              style={{ background: `linear-gradient(135deg, ${P.c1}, ${P.c2} 60%, ${P.c3})` }}
            >
              Create Account
              <span className="ml-2 block h-[1px] w-4 translate-y-[1px] bg-white/70 group-hover:w-6 transition-all" />
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-[15px] font-medium text-slate-200 transition hover:bg-white/10"
            >
              Login
            </Link>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="relative z-10 pb-10 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} MindCanvas. All rights reserved.
      </footer>
    </main>
  );
}

