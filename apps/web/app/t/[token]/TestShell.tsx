'use client';

/**
 * TestShell — Minimal, document-aligned header (no gradients)
 * Purely presentational. Wraps your existing PublicTestClient.
 */

import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  kicker?: string;
};

export default function TestShell({
  children,
  title = 'Discover your Profile',
  subtitle = 'Answer a few questions to reveal your strengths and working rhythm.',
  kicker = 'MindCanvas • Signature Test',
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

      <main className="mc-container -mt-4 grow mb-8">
        <Card className="p-0">
          <div className="p-6 md:p-8">{children}</div>
        </Card>
      </main>

      <footer className="mc-container py-8 text-sm mc-muted flex items-center justify-between">
        <span>© {new Date().getFullYear()} MindCanvas — Profiletest.ai</span>
        <Button
          variant="ghost"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          Back to top ↑
        </Button>
      </footer>
    </div>
  );
}
