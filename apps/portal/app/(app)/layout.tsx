import "../globals.css";
import type { ReactNode } from "react";
import NavClient from "./NavClient";

export default function AppLayout({ children }: { children: ReactNode }) {
  // You can tweak these or rely on NavClient's built-in defaults
  const items = [
    { href: "/portal", label: "Dashboard", exact: true },
    { href: "/portal/clients", label: "Clients" },
    { href: "/portal/tests", label: "Tests" },
    { href: "/portal/results", label: "Results" }
  ];

  return (
    <div className="min-h-screen grid grid-cols-[220px_1fr] gap-6 p-6">
      <aside className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <NavClient items={items} />
      </aside>

      <main className="rounded-2xl border border-white/10 bg-white/5 p-6">
        {children}
      </main>
    </div>
  );
}
