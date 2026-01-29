"use client";

/**
 * TestShell
 * -----------
 * Branded shell for the public test flow.
 * NOTE: Layout / visuals only — no logic or data is changed.
 */

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

type Props = {
  children: ReactNode;
  /**
   * Optional: organisation name, e.g. "Team Puzzle"
   */
  orgName?: string;
  /**
   * Optional: test name, e.g. "Discovery Assessment"
   */
  testTitle?: string;
};

type TestMetaDetail = {
  orgName?: string | null;
  testName?: string | null;
};

export default function TestShell({ children, orgName, testTitle }: Props) {
  const year = new Date().getFullYear();

  // Hero title driven either by props (if ever used in future) or by
  // the client-side event emitted from PublicTestClient.
  const [heroTitle, setHeroTitle] = useState<string | null>(() => {
    if (orgName && testTitle) return `${orgName} — ${testTitle}`;
    if (testTitle) return testTitle;
    return null;
  });

  useEffect(() => {
    // Update if props change
    if (orgName && testTitle) {
      setHeroTitle(`${orgName} — ${testTitle}`);
    } else if (testTitle) {
      setHeroTitle(testTitle);
    }
  }, [orgName, testTitle]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (event: Event) => {
      const custom = event as CustomEvent<TestMetaDetail>;
      const detail = custom.detail || {};
      const oName = detail.orgName ?? null;
      const tName = detail.testName ?? null;

      if (oName && tName) {
        setHeroTitle(`${oName} — ${tName}`);
      } else if (tName) {
        setHeroTitle(tName);
      }
      // if nothing provided, keep existing heroTitle / fallback
    };

    window.addEventListener("mc_test_meta", handler as EventListener);
    return () => {
      window.removeEventListener("mc_test_meta", handler as EventListener);
    };
  }, []);

  const finalHeading =
    heroTitle || "Complete your profile test";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Global MindCanvas background (grid + glows) */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        aria-hidden="true"
      >
        {/* Soft radial glows */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#1d4ed8_0,_transparent_55%),radial-gradient(circle_at_bottom,_#0f766e_0,_transparent_55%)] opacity-70" />
        {/* Dark overlay + subtle grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#020617,rgba(2,6,23,0.92)),url('/images/mc-grid.svg')]" />
      </div>

      <div className="relative flex min-h-screen flex-col">
        {/* Top band / hero */}
        <header className="border-b border-white/10 bg-gradient-to-r from-[#64bae2] via-sky-500 to-[#015a8b]">
          <div className="mx-auto max-w-5xl px-4 py-5 md:py-6">
            <p className="text-xs uppercase tracking-[0.18em] text-sky-50/80">
              Signature Profiling System
            </p>

            <h1 className="mt-1 text-2xl font-semibold md:text-3xl text-white">
              {finalHeading}
            </h1>

            <p className="mt-1 text-sm text-sky-50/90 max-w-2xl">
              Answer each question honestly and instinctively. Your responses
              will be used to generate your personalised report and insights
              for your organisation.
            </p>
          </div>
        </header>

        {/* Main content area */}
        <main className="mx-auto flex w-full max-w-5xl flex-1 px-4 py-6 md:py-10">
          <div className="w-full rounded-2xl border border-white/10 bg-slate-900/80 shadow-xl shadow-sky-950/40 backdrop-blur">
            <div className="border-b border-white/5 px-4 py-4 md:px-6 md:py-5">
              <h2 className="text-base font-semibold text-slate-50">
                Your test
              </h2>
              <p className="mt-1 text-xs text-slate-300/80">
                Progress will update as you move through the questions.
              </p>
            </div>

            <div className="px-4 py-4 md:px-6 md:py-6">{children}</div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-slate-950/95">
          <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-4 text-xs text-slate-400 md:flex-row md:items-center md:justify-between">
            <span>© {year} MindCanvas — Profiletest.ai</span>
            <span className="text-[11px] text-slate-500">
              Your responses are confidential and only used for profiling
              purposes agreed with your organisation.
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

