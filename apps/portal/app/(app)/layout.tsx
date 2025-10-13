import { ReactNode } from 'react';
import NavClient from './NavClient';

const SIDEBAR_BG = '#110b79';
const APP_BG = '#484995';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div style={{ backgroundColor: APP_BG, minHeight: '100vh' }}>
      <div className="mx-auto flex max-w-7xl gap-0 px-4 py-6 md:gap-6 md:px-6">
        {/* Sidebar */}
        <aside
          className="hidden w-64 shrink-0 rounded-2xl p-5 md:block"
          style={{ backgroundColor: SIDEBAR_BG }}
        >
          <div className="mb-6">
            <div className="text-lg font-semibold text-white">MindCanvas</div>
            <div className="text-xs text-white/70">Competency Coach</div>
          </div>

          {/* Client nav handles active link highlighting */}
          <NavClient />
        </aside>

        {/* Content card */}
        <main className="w-full">
          <div className="rounded-2xl bg-white shadow-sm">{children}</div>
        </main>
      </div>
    </div>
  );
}
