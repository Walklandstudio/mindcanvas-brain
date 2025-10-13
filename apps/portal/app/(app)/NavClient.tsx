"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import React from "react";

type NavItem = {
  href: string;          // we’ll cast to Route when passing to <Link>
  label: string;
  icon?: React.ReactNode;
  exact?: boolean;
};

type Props = {
  items?: NavItem[];     // now optional; we’ll fall back to defaults
  className?: string;
};

// Helper: cast plain string paths to a typed Route (for typedRoutes)
const toRoute = (href: string): Route => (href as unknown as Route);

// Safe default nav
const DEFAULT_ITEMS: NavItem[] = [
  { href: "/portal", label: "Dashboard", exact: true },
  { href: "/portal/clients", label: "Clients" },
  { href: "/portal/tests", label: "Tests" },
  { href: "/portal/results", label: "Results" }
];

export default function NavClient({ items, className }: Props) {
  const pathname = usePathname() || "/";
  const list = items && items.length ? items : DEFAULT_ITEMS;

  return (
    <nav className={clsx("flex flex-col gap-1", className)}>
      {list.map((it) => {
        const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={toRoute(it.href)}
            className={clsx(
              "block rounded-md px-3 py-2 text-sm transition",
              active
                ? "bg-white/10 text-white"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            )}
            aria-current={active ? "page" : undefined}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
