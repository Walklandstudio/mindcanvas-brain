'use client';

/**
 * TestReportShell — Minimal, document-aligned header
 * Purely presentational. Wraps your existing ReportClient.
 */

import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  kicker?: string;
  showSummary?: boolean;
};

export default function TestReportShell({
  children,
  title = 'Your Signature Report',
  subtitle = 'A clear view of your strengths and working rhythm.',
  kicker = 'MindCanvas • Results',
  showSummary = true,
}: Props) {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="mc-hero--minimal">
        <div className="mc-container mc-hero__inner">
          <div className="mc-hero__bar" />
          <p className="mc-hero__kicker">{kicker}</p>
          <h1 className="mc-hero__title">{title}</h1>
          <p className="mc-hero__subtitle">{subtitle}</p>
        </div>
      </header>

      <main className="mc-container -mt-4 grow mb-8 space-y-6">
        {showSummary && (
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-xs mc-muted">Primary Frequency</div>
              <div className="mt-1 text-lg font-medium">Top Match</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs mc-muted">Dominant Profile</div>
              <div className="mt-1 text-lg font-medium">Profile Name</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs mc-muted">Completion</div>
              <div className="mt-1 text-lg font-medium">Success</div>
            </Card>
          </div>
        )}

        <Card className="p-0">
          <div className="px-6 pt-6">
            <h2 style={{ fontSize: 'var(--mc-h2)', fontWeight: 700, letterSpacing: 'var(--mc-tight)' }}>
              Your Results
            </h2>
            <p className="mt-1 text-sm mc-muted">Visuals and insights are rendered below. (Data/logic unchanged.)</p>
          </div>
          <div className="px-6 pb-6">{children}</div>
        </Card>
      </main>

      <footer className="mc-container py-8 text-sm mc-muted">
        © {new Date().getFullYear()} MindCanvas — Profiletest.ai
      </footer>
    </div>
  );
}
