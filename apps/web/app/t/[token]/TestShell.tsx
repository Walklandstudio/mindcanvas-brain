'use client';

/**
 * MindCanvas TestShell
 * --------------------------------------------------------
 * Wraps the public test-taking experience with branded layout.
 * Applies MindCanvas brand colors, typography, and hero section.
 * No logic or API dependencies — purely presentational.
 */

import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type TestShellProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
};

export default function TestShell({
  children,
  title = 'Discover your Signature Profile',
  subtitle = 'Answer a few questions to reveal your strengths and working rhythm.',
}: TestShellProps) {
  return (
    <div className="min-h-dvh flex flex-col">
      {/* Hero Header */}
      <section className="mc-hero">
        <div className="mc-container py-10">
          <div className="max-w-3xl">
            <p className="text-sm/relaxed opacity-90">MindCanvas • Signature Test</p>
            <h1 className="mt-1 text-3xl md:text-4xl font-display font-semibold tracking-tight">
              {title.includes('Signature') ? (
                <>
                  {title.split('Signature')[0]}
                  <span className="mc-gradient-text">Signature</span>
                  {title.split('Signature')[1] ?? ' Profile'}
                </>
              ) : (
                title
              )}
            </h1>
            <p className="mt-2 text-sm/relaxed opacity-95">{subtitle}</p>
          </div>
        </div>
      </section>

      {/* Main content area */}
      <main className="mc-container -mt-8 grow mb-8">
        <Card className="p-0">
          <div className="p-6 md:p-8">{children}</div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="mc-container py-8 text-sm text-[hsl(var(--mc-subtle))] flex items-center justify-between">
        <span>© {new Date().getFullYear()} MindCanvas — Profiletest.ai</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          Back to top ↑
        </Button>
      </footer>
    </div>
  );
}
