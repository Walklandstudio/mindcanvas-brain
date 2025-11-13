"use client";

/**
 * TestShell
 * -----------
 * Simple branded shell for the public test flow.
 * It does NOT change any logic or data – it only
 * provides a consistent layout around PublicTestClient.
 */

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function TestShell({ children }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      {/* Top band / hero */}
      <header className="border-b border-white/10 bg-gradient-to-r from-sky-600/70 via-cyan-500/60 to-teal-400/70">
        <div className="mx-auto max-w-5xl px-4 py-5 md:py-6">
          <p className="text-xs uppercase tracking-[0.18em] text-sky-50/80">
            MindCanvas • Signature Profiling System
          </p>
          <h1 className="mt-1 text-2xl font-semibold md:text-3xl text-white">
            Complete your profile test
          </h1>
          <p className="mt-1 text-sm text-sky-50/90 max-w-2xl">
            Answer each question honestly and instinctively. Your responses will
            be used to generate your personalised report and insights.
          </p>
        </div>
      </header>

      {/* Main content area */}
      <main className="mx-auto max-w-5xl px-4 py-6 md:py-10">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl shadow-sky-950/40 backdrop-blur">
          <div className="border-b border-white/5 px-4 py-4 md:px-6 md:py-5">
            <h2 className="text-base font-semibold text-slate-50">
              Your test
            </h2>
            <p className="mt-1 text-xs text-slate-300/80">
              Progress will update as you move through the questions.
            </p>
          </div>

          <div className="px-4 py-4 md:px-6 md:py-6">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950/90">
        <div className="mx-auto max-w-5xl px-4 py-4 text-xs text-slate-400 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} MindCanvas — Profiletest.ai</span>
          <span className="text-[11px] text-slate-500">
            Your responses are confidential and only used for profiling
            purposes agreed with your organisation.
          </span>
        </div>
      </footer>
    </div>
  );
}
