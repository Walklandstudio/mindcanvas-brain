'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const items = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/clients', label: 'Clients' },
  { href: '/tests', label: 'Tests' },
  { href: '/profile', label: 'Profile' },
];

export default function NavClient() {
  const pathname = usePathname() || '';

  return (
    <nav className="space-y-1">
      {items.map((it) => {
        const active =
          pathname === it.href ||
          (pathname.startsWith(it.href + '/') && it.href !== '/');
        return (
          <Link
            key={it.href}
            href={it.href}
            className={clsx(
              'block rounded-md px-3 py-2 text-sm transition',
              active
                ? 'bg-white/20 text-white'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
