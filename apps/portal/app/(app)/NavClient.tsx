"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import clsx from "clsx";

type NavItem = {
  href: string;          // we’ll cast it to Route when passing to <Link>
  label: string;
  icon?: React.ReactNode;
  exact?: boolean;
};

type Props = {
  items: NavItem[];
  className?: string;
};

// Helper: cast plain string paths to a typed Route
const toRoute = (href: string): Route => (href as unknown as Route);

export default function NavClient({ items, className }: Props) {
  const pathname = usePathname() || "/";

  return (
    <nav className={clsx("flex flex-col gap-1", className)}>
      {items.map((it) => {
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
            {it.icon && <span className="mr-2 inline-flex">{it.icon}</span>}
            <span className="truncate">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
