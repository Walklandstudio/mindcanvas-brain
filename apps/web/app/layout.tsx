import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'MindCanvas',
  description: 'Signature Profiling System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full mc-bg text-white">
        <header className="container mx-auto flex items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-brand-500/60 shadow-md" />
            <span className="text-lg font-semibold">MindCanvas</span>
          </Link>

          <nav className="flex items-center gap-8 text-sm text-white/80">
            <Link href="/tests" className="hover:text-white">Tests</Link>
            <Link href="/admin/framework" className="hover:text-white">Framework</Link>
            <Link href="/admin/reports" className="hover:text-white">Reports</Link>
            <Link href="/compatibility" className="hover:text-white">Compatibility</Link>
          </nav>
        </header>

        <main className="container mx-auto px-6 pb-20">{children}</main>

        <footer className="mt-16 border-t border-white/10">
          <div className="container mx-auto px-6 py-8 text-xs text-white/60">
            © {new Date().getFullYear()} MindCanvas. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  );
}
