"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import clsx from "clsx";

type NavItem = {
  href: string | Route; // we’ll safely cast strings to Route
  label: string;
  icon?: React.ReactNode;
  exact?: boolean; // if true, uses exact match; otherwise prefix match
};

type Props = {
  items: NavItem[];
  className?: string;
};

const toRoute = (href: string | Route): Route =>
  (href as unknown) as Route;

export default function NavClient({ items, className }: Props) {
  const pathname = usePathname() || "/";

  return (
    <nav className={clsx("flex flex-col gap-1", className)}>
      {items.map((it) => {
        const href = String(it.href);
        const active = it.exact ? pathname === href : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={toRoute(it.href)}
            className={clsx(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition",
              active
                ? "bg-white/10 text-white"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            )}
            aria-current={active ? "page" : undefined}
          >
            {it.icon && <span className="shrink-0">{it.icon}</span>}
            <span className="truncate">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
