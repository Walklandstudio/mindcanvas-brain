"use client";

export default function BackgroundGrid() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10">
      {/* depth gradient (landing-page feel) */}
      <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_-10%,#113149_0%,#08121b_55%,#060e16_100%)]" />
      {/* grid lines */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}
