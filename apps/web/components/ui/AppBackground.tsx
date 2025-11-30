// apps/web/components/ui/AppBackground.tsx
"use client";

const P = { c1: "#64bae2", c2: "#2d8fc4", c3: "#015a8b" };

export default function AppBackground() {
  return (
    <>
      {/* Blurry radial glows */}
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
    </>
  );
}
