import Link from "next/link";

export default function OrgLayout({ children, params }: any) {
  const { slug } = params;
  const tabs = [
    { href: `/portal/${slug}`, label: "Dashboard" },
    { href: `/portal/${slug}/database`, label: "Database" },
    { href: `/portal/${slug}/tests`, label: "Tests" },
    { href: `/portal/${slug}/settings`, label: "Profile Settings" },
  ];
  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{slug}</h1>
        <Link href="/portal/admin" className="text-sm underline">Back to admin</Link>
      </header>
      <nav className="flex gap-3">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="px-3 py-2 rounded-lg border hover:bg-gray-50"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <section>{children}</section>
    </div>
  );
}
