"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/onboarding/create-account", label: "Onboarding" },
  { href: "/admin/framework", label: "Framework" },
  { href: "/admin/test-builder", label: "Test Builder" },
  { href: "/admin/reports", label: "Reports" },
  // NOTE: Intentionally NO “Demo” link and NO “Compatibility”
];

function NavLink({ href, label }: { href: string; label: string }) {
  // Next 15 types this as string | null; coerce to '' so startsWith is safe.
  const pathname = usePathname() ?? "";
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={[
        "px-3 py-2 rounded-lg text-sm transition",
        active ? "bg-white/10 text-white" : "text-white/80 hover:text-white hover:bg-white/5",
      ].join(" ")}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="mc-bg border-b border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-sky-400 to-sky-700" />
          <span className="text-white font-semibold tracking-wide">MindCanvas</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <NavLink key={l.href} href={l.href} label={l.label} />
          ))}
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden text-white/90 rounded-lg px-3 py-2 hover:bg-white/10"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          ☰
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="md:hidden border-t border-white/10">
          <nav className="mx-auto max-w-6xl px-4 py-2 flex flex-col gap-1">
            {links.map((l) => (
              <NavLink key={l.href} href={l.href} label={l.label} />
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
