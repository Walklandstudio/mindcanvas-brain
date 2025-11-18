'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  orgSlug: string;
  orgName?: string | null;
  children: React.ReactNode;
};

const tabs = [
  { label: "Dashboard", path: "dashboard" },
  { label: "Database",  path: "database" },
  { label: "Tests",     path: "tests" },
  { label: "Profile Settings", path: "profile" }
];

export default function PortalChrome({ orgSlug, orgName, children }: Props) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4">
        <h1 className="text-xl font-semibold">
          {orgName || orgSlug}
        </h1>
        <Link href="/admin" className="text-sm underline opacity-80 hover:opacity-100">
          Back to admin
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-5 pb-4 flex-wrap">
        {tabs.map(t => {
          const href = `/portal/${orgSlug}/${t.path}`;
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={t.path}
              href={href}
              className={`text-sm rounded-md px-3 py-1.5 border ${
                active
                  ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]"
                  : "border-neutral-200 hover:bg-neutral-50"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* Page body */}
      <div className="px-5 pb-10">
        {children}
      </div>
    </div>
  );
}
